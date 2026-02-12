package com.gsg.it4u.security;

import com.gsg.it4u.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

@Service
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    @Autowired
    private UserService userService;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        // 1. Load user from Azure
        OAuth2User oauthUser = super.loadUser(userRequest);

        System.out.println("CustomOAuth2UserService: Loaded user from Azure: " + oauthUser.getName());

        try {
            // 2. Delegate to UserService to find or create user
            userService.createFromAzure(oauthUser);
        } catch (Exception e) {
            System.err.println("Error in CustomOAuth2UserService: " + e.getMessage());
            e.printStackTrace();
            // We don't rethrow here because we want the auth to succeed technically,
            // even if local DB sync fails (though success handler might fail later).
            // Better to let success handler handle final login logic, but this ensures DB
            // is primed.
        }

        return oauthUser;
    }
}
