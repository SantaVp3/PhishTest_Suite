use bcrypt::{hash, verify, BcryptError, DEFAULT_COST};

/// 哈希密码
pub fn hash_password(password: &str) -> Result<String, BcryptError> {
    hash(password, DEFAULT_COST)
}

/// 验证密码
pub fn verify_password(password: &str, hash: &str) -> Result<bool, BcryptError> {
    verify(password, hash)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_password_hashing() {
        let password = "test_password_123";
        let hashed = hash_password(password).expect("Failed to hash password");
        
        assert_ne!(password, hashed);
        assert!(verify_password(password, &hashed).unwrap());
        assert!(!verify_password("wrong_password", &hashed).unwrap());
    }
}

