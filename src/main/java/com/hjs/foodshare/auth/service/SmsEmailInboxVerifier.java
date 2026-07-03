package com.hjs.foodshare.auth.service;

import java.util.Optional;

public interface SmsEmailInboxVerifier {

    Optional<String> findSenderPhoneByCode(String code);
}
