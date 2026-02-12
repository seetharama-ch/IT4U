package com.gsg.it4u.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeIn;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.security.SecuritySchemes;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(info = @Info(title = "IT4U API", version = "v1"), security = {
        @SecurityRequirement(name = "cookieAuth")
})
@SecuritySchemes({
        @SecurityScheme(name = "cookieAuth", type = SecuritySchemeType.APIKEY, in = SecuritySchemeIn.COOKIE, paramName = "JSESSIONID"),
        @SecurityScheme(name = "bearerAuth", type = SecuritySchemeType.HTTP, scheme = "bearer", bearerFormat = "JWT")
})
public class OpenApiConfig {
}
