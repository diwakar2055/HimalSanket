"""
Cloud Firestore (Firebase) Persistence Service for HimalSanket Orchestrator.

Persists full multi-hazard assessment sessions (sensor inputs, Risk Engine calculations,
and Google Gemini intelligence briefings) into Cloud Firestore for audit logging,
real-time dashboard sync, and mobile alert dispatch.

Provides high-reliability failover:
- Uses Google Cloud Firestore / Firebase Admin SDK when credentials or project ID are configured.
- Gracefully falls back to a thread-safe local session store when running offline or in demo mode,
  guaranteeing zero server crashes.
"""

import os
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
import threading

from config import settings
from models import FirestoreSyncStatus

logger = logging.getLogger("himalsanket.firestore")


class LocalSessionStore:
    """
    Thread-safe in-memory session store providing seamless fallback
    when remote Cloud Firestore credentials are not available.
    """
    def __init__(self, max_size: int = 1000):
        self._store: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()
        self._max_size = max_size

    def save(self, session_id: str, data: Dict[str, Any]) -> None:
        with self._lock:
            if len(self._store) >= self._max_size:
                # Evict oldest entry
                oldest_key = next(iter(self._store))
                self._store.pop(oldest_key, None)
            self._store[session_id] = data

    def get(self, session_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            return self._store.get(session_id)

    def list_recent(self, limit: int = 20) -> List[Dict[str, Any]]:
        with self._lock:
            items = list(self._store.values())
            # Return most recent first
            return items[-limit:][::-1]

    def clear(self) -> None:
        with self._lock:
            self._store.clear()


class FirestoreService:
    """
    Unified Cloud Firestore manager for persisting orchestrated hazard sessions.
    """
    def __init__(self):
        self._db_client = None
        self._backend_type = "Local Memory Fallback"
        self._fallback_store = LocalSessionStore(max_size=settings.cache_max_size)
        self._collection_name = settings.firestore_collection
        self._initialize_client()

    def _initialize_client(self):
        """
        Attempts to initialize the live Google Cloud Firestore client.
        Falls back to local memory store if credentials/project are absent or libraries uninstalled.
        """
        if not settings.firestore_enabled:
            logger.info("Firestore integration explicitly disabled via settings. Using local store.")
            self._backend_type = "Local Memory Fallback"
            return

        project_id = (
            settings.firebase_project_id
            or os.environ.get("FIREBASE_PROJECT_ID")
            or os.environ.get("GCP_PROJECT")
            or os.environ.get("GOOGLE_CLOUD_PROJECT")
        )

        # 1. Try google.cloud.firestore
        try:
            from google.cloud import firestore
            if project_id:
                self._db_client = firestore.Client(project=project_id)
            else:
                self._db_client = firestore.Client()
            self._backend_type = "Cloud Firestore"
            logger.info(f"Initialized live Google Cloud Firestore client (project={self._db_client.project})")
            return
        except Exception as e:
            logger.debug(f"google.cloud.firestore client init skipped/failed: {str(e)}")

        # 2. Try firebase_admin.firestore
        try:
            import firebase_admin
            from firebase_admin import credentials, firestore
            if not firebase_admin._apps:
                cred_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
                if cred_path and os.path.exists(cred_path):
                    cred = credentials.Certificate(cred_path)
                    firebase_admin.initialize_app(cred, {"projectId": project_id} if project_id else None)
                elif project_id:
                    firebase_admin.initialize_app(options={"projectId": project_id})
                else:
                    firebase_admin.initialize_app()
            self._db_client = firestore.client()
            self._backend_type = "Firebase Admin Firestore"
            logger.info("Initialized live Firebase Admin Firestore client")
            return
        except Exception as e:
            logger.debug(f"firebase_admin firestore init skipped/failed: {str(e)}")

        # Fallback to local session store
        self._backend_type = "Local Memory Fallback"
        logger.info(
            "Cloud Firestore credentials not detected. Operating in high-reliability Local Fallback Store mode "
            "(sessions safely retained in-memory for queries & testing)."
        )

    @property
    def backend_type(self) -> str:
        return self._backend_type

    def save_session(self, session_id: str, session_data: Dict[str, Any]) -> FirestoreSyncStatus:
        """
        Persists an orchestrated assessment session document.
        """
        now = datetime.now(timezone.utc)
        session_data["saved_at"] = now.isoformat()

        # Always save to local fallback store for instant fast retrieval
        self._fallback_store.save(session_id, session_data)

        if self._db_client is not None:
            try:
                doc_ref = self._db_client.collection(self._collection_name).document(session_id)
                doc_ref.set(session_data)
                logger.info(f"Persisted session {session_id} to Firestore collection '{self._collection_name}'")
                return FirestoreSyncStatus(
                    saved=True,
                    collection=self._collection_name,
                    session_id=session_id,
                    synced_at=now,
                    storage_backend=self._backend_type,
                    error=None
                )
            except Exception as e:
                logger.warning(
                    f"Failed writing to live Cloud Firestore ({str(e)}). Retained in local fallback store.",
                    exc_info=False
                )
                return FirestoreSyncStatus(
                    saved=True,
                    collection=self._collection_name,
                    session_id=session_id,
                    synced_at=now,
                    storage_backend=f"Local Memory Fallback (Firestore write failed: {str(e)})",
                    error=str(e)
                )

        return FirestoreSyncStatus(
            saved=True,
            collection=self._collection_name,
            session_id=session_id,
            synced_at=now,
            storage_backend="Local Memory Fallback",
            error=None
        )

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetches an assessment session by its ID.
        """
        # Check local memory first
        local_data = self._fallback_store.get(session_id)
        if local_data:
            return local_data

        if self._db_client is not None:
            try:
                doc_ref = self._db_client.collection(self._collection_name).document(session_id)
                doc = doc_ref.get()
                if doc.exists:
                    return doc.to_dict()
            except Exception as e:
                logger.error(f"Error fetching session {session_id} from Firestore: {str(e)}")

        return None

    def list_sessions(self, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Retrieves recent sessions for the frontend dashboard history.
        """
        if self._db_client is not None:
            try:
                docs = (
                    self._db_client.collection(self._collection_name)
                    .order_by("saved_at", direction="DESCENDING")
                    .limit(limit)
                    .stream()
                )
                return [d.to_dict() for d in docs]
            except Exception as e:
                logger.warning(f"Error listing sessions from Firestore ({str(e)}), using local store.")

        return self._fallback_store.list_recent(limit=limit)


# Singleton Firestore service instance
firestore_service = FirestoreService()
