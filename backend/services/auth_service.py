import jwt
import secrets
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict

logger = logging.getLogger(__name__)


class AuthService:
    """
    Authentication Service for Admin Panel
    Handles password verification and JWT token generation
    """
    
    def __init__(self, admin_password: str, jwt_secret: str, token_expiry_hours: int = 8):
        self.admin_password = admin_password
        self.jwt_secret = jwt_secret
        self.algorithm = "HS256"
        self.token_expiry_hours = min(token_expiry_hours, 24)
        
        if not self.admin_password or len(self.admin_password) < 8:
            logger.warning("⚠️  Admin password is weak or not set!")
        
        if not self.jwt_secret or len(self.jwt_secret) < 32:
            logger.warning("⚠️  JWT secret is weak or not set!")
        
        logger.info("🔐 Auth Service initialized")

    def verify_admin_password(self, password: str) -> bool:
        """
        Verify admin password using constant-time comparison to prevent timing attacks

        Args:
            password: Password to verify

        Returns:
            bool: True if password matches
        """
        try:
            if not password or not self.admin_password:
                return False

            # Use constant-time comparison to prevent timing attacks
            # secrets.compare_digest ensures the comparison takes the same time
            # regardless of where the strings differ
            is_valid = secrets.compare_digest(
                password.encode('utf-8'),
                self.admin_password.encode('utf-8')
            )

            if is_valid:
                logger.info("✅ Admin password verified")
            else:
                logger.warning("❌ Invalid admin password attempt")

            return is_valid

        except Exception as e:
            logger.error(f"Password verification error: {e}")
            return False

    def generate_token(self, additional_claims: Optional[Dict] = None) -> str:
        """
        Generate JWT token for admin
        
        Args:
            additional_claims: Optional additional claims to include
            
        Returns:
            str: JWT token
        """
        try:
            expiry = datetime.utcnow() + timedelta(hours=self.token_expiry_hours)
            
            payload = {
                "role": "admin",
                "exp": expiry,
                "iat": datetime.utcnow(),
            }
            
            if additional_claims:
                payload.update(additional_claims)
            
            token = jwt.encode(payload, self.jwt_secret, algorithm=self.algorithm)
            
            logger.info(f"🎫 Generated admin token (expires: {expiry.isoformat()})")
            
            return token
            
        except Exception as e:
            logger.error(f"Token generation error: {e}")
            raise

    def verify_token(self, token: str) -> Optional[Dict]:
        """
        Verify and decode JWT token
        
        Args:
            token: JWT token to verify
            
        Returns:
            Optional[Dict]: Decoded payload if valid, None otherwise
        """
        try:
            if not token:
                return None
            
            payload = jwt.decode(
                token, 
                self.jwt_secret, 
                algorithms=[self.algorithm]
            )
            
            if payload.get("role") != "admin":
                logger.warning("❌ Token role is not admin")
                return None
            
            logger.debug("✅ Token verified successfully")
            return payload
            
        except jwt.ExpiredSignatureError:
            logger.warning("⏰ Token has expired")
            return None
            
        except jwt.InvalidTokenError as e:
            logger.warning(f"❌ Invalid token: {e}")
            return None
            
        except Exception as e:
            logger.error(f"Token verification error: {e}")
            return None

    def refresh_token(self, old_token: str) -> Optional[str]:
        """
        Refresh an existing token
        
        Args:
            old_token: Token to refresh
            
        Returns:
            Optional[str]: New token if successful
        """
        try:
            payload = self.verify_token(old_token)
            
            if not payload:
                return None
            
            # Remove exp and iat from old payload
            payload.pop("exp", None)
            payload.pop("iat", None)
            
            new_token = self.generate_token(additional_claims=payload)
            
            logger.info("🔄 Token refreshed successfully")
            
            return new_token
            
        except Exception as e:
            logger.error(f"Token refresh error: {e}")
            return None

    def is_token_expired(self, token: str) -> bool:
        """
        Check if token is expired
        
        Args:
            token: Token to check
            
        Returns:
            bool: True if expired
        """
        try:
            jwt.decode(
                token,
                self.jwt_secret,
                algorithms=[self.algorithm]
            )
            return False

        except jwt.ExpiredSignatureError:
            return True

        except (jwt.InvalidTokenError, jwt.DecodeError) as e:
            logger.warning(f"Token validation error: {e}")
            return True

    def get_token_expiry(self, token: str) -> Optional[datetime]:
        """
        Get token expiry time
        
        Args:
            token: Token to check
            
        Returns:
            Optional[datetime]: Expiry time if valid
        """
        try:
            payload = jwt.decode(
                token, 
                self.jwt_secret, 
                algorithms=[self.algorithm],
                options={"verify_exp": False}
            )
            
            exp_timestamp = payload.get("exp")

            if exp_timestamp:
                # Use utcfromtimestamp to match utcnow() used in token generation
                return datetime.utcfromtimestamp(exp_timestamp)

            return None
            
        except Exception as e:
            logger.error(f"Error getting token expiry: {e}")
            return None