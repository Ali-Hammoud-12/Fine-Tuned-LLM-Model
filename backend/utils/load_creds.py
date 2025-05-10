import os
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ['https://www.googleapis.com/auth/generative-language.retriever']

def load_creds():
    """Loads credentials from token.json or uses OAuth flow if needed."""
    creds = None
    token_path = os.environ.get("GOOGLE_AUTH_TOKEN_PATH", "token.json")

    # Load existing token
    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)

    # Refresh or obtain new token
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            client_secret_path = os.path.join(base_dir, 'client_secret.json')
            flow = InstalledAppFlow.from_client_secrets_file(client_secret_path, SCOPES)

            # Fallback only works locally
            creds = flow.run_local_server(port=0)

        # Only write token if path is not set externally (i.e. running locally)
        if token_path == "token.json":
            with open(token_path, 'w') as token_file:
                token_file.write(creds.to_json())

    return creds
