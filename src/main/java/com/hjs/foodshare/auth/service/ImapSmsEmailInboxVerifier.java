package com.hjs.foodshare.auth.service;

import com.hjs.foodshare.global.exception.BusinessException;
import jakarta.mail.Address;
import jakarta.mail.BodyPart;
import jakarta.mail.Folder;
import jakarta.mail.Message;
import jakarta.mail.Multipart;
import jakarta.mail.Session;
import jakarta.mail.Store;
import jakarta.mail.internet.InternetAddress;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import java.util.Properties;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class ImapSmsEmailInboxVerifier implements SmsEmailInboxVerifier {

    private final String host;
    private final int port;
    private final String username;
    private final String password;
    private final boolean sslEnabled;
    private final String allowedDomains;

    public ImapSmsEmailInboxVerifier(
            @Value("${app.phone-verification.imap.host:imap.gmail.com}") String host,
            @Value("${app.phone-verification.imap.port:993}") int port,
            @Value("${app.phone-verification.imap.username:}") String username,
            @Value("${app.phone-verification.imap.password:}") String password,
            @Value("${app.phone-verification.imap.ssl:true}") boolean sslEnabled,
            @Value("${app.phone-verification.allowed-domains:vmms.nate.com,ktfmms.magicn.com,lguplus.com}") String allowedDomains
    ) {
        this.host = host;
        this.port = port;
        this.username = username;
        this.password = password;
        this.sslEnabled = sslEnabled;
        this.allowedDomains = allowedDomains;
    }

    @Override
    public Optional<String> findSenderPhoneByCode(String code) {
        if (username == null || username.isBlank() || password == null || password.isBlank()) {
            throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, "Phone verification mailbox is not configured.");
        }

        Properties properties = new Properties();
        properties.put("mail.store.protocol", sslEnabled ? "imaps" : "imap");
        properties.put("mail.imap.ssl.enable", String.valueOf(sslEnabled));
        properties.put("mail.imaps.ssl.enable", String.valueOf(sslEnabled));
        properties.put("mail.imap.connectiontimeout", "5000");
        properties.put("mail.imap.timeout", "5000");
        properties.put("mail.imaps.connectiontimeout", "5000");
        properties.put("mail.imaps.timeout", "5000");

        Store store = null;
        Folder inbox = null;
        try {
            Session session = Session.getInstance(properties);
            store = session.getStore(sslEnabled ? "imaps" : "imap");
            store.connect(host, port, username, password);
            inbox = store.getFolder("INBOX");
            inbox.open(Folder.READ_ONLY);

            int messageCount = inbox.getMessageCount();
            if (messageCount <= 0) {
                return Optional.empty();
            }
            int start = Math.max(1, messageCount - 50 + 1);
            Message[] messages = inbox.getMessages(start, messageCount);
            for (int i = messages.length - 1; i >= 0; i--) {
                Message message = messages[i];
                if (!messageContains(message, code)) {
                    continue;
                }
                return extractVerifiedPhone(message.getFrom());
            }
            return Optional.empty();
        } catch (BusinessException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, "Failed to check phone verification mailbox.");
        } finally {
            closeQuietly(inbox);
            closeQuietly(store);
        }
    }

    private Optional<String> extractVerifiedPhone(Address[] fromAddresses) {
        if (fromAddresses == null || fromAddresses.length == 0) {
            return Optional.empty();
        }
        String address = fromAddresses[0] instanceof InternetAddress internetAddress
                ? internetAddress.getAddress()
                : fromAddresses[0].toString();
        String lowerAddress = address.toLowerCase();
        int atIndex = lowerAddress.indexOf('@');
        if (atIndex < 1 || atIndex == lowerAddress.length() - 1) {
            return Optional.empty();
        }
        String domain = lowerAddress.substring(atIndex + 1);
        if (!isAllowedDomain(domain)) {
            return Optional.empty();
        }
        String phone = lowerAddress.substring(0, atIndex).replaceAll("[^0-9]", "");
        return phone.isBlank() ? Optional.empty() : Optional.of(phone);
    }

    private boolean isAllowedDomain(String domain) {
        for (String allowedDomain : allowedDomains.split(",")) {
            if (domain.equals(allowedDomain.trim().toLowerCase())) {
                return true;
            }
        }
        return false;
    }

    private boolean messageContains(Message message, String code) throws Exception {
        Object content = message.getContent();
        if (content instanceof String text) {
            return text.contains(code);
        }
        if (content instanceof Multipart multipart) {
            return multipartContains(multipart, code);
        }
        if (content instanceof InputStream stream) {
            return new String(stream.readAllBytes(), StandardCharsets.UTF_8).contains(code);
        }
        return message.getSubject() != null && message.getSubject().contains(code);
    }

    private boolean multipartContains(Multipart multipart, String code) throws Exception {
        for (int i = 0; i < multipart.getCount(); i++) {
            BodyPart bodyPart = multipart.getBodyPart(i);
            Object content = bodyPart.getContent();
            if (content instanceof String text && text.contains(code)) {
                return true;
            }
            if (content instanceof Multipart nested && multipartContains(nested, code)) {
                return true;
            }
            if (content instanceof InputStream stream
                    && new String(stream.readAllBytes(), StandardCharsets.UTF_8).contains(code)) {
                return true;
            }
        }
        return false;
    }

    private void closeQuietly(Folder folder) {
        try {
            if (folder != null && folder.isOpen()) {
                folder.close(false);
            }
        } catch (Exception ignored) {
        }
    }

    private void closeQuietly(Store store) {
        try {
            if (store != null && store.isConnected()) {
                store.close();
            }
        } catch (Exception ignored) {
        }
    }
}
