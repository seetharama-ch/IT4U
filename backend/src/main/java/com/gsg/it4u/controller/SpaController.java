package com.gsg.it4u.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class SpaController {

    // Forward all non-API paths starting with /app/ or /login to index.html
    @RequestMapping(value = { "/app/**", "/login" })
    public String redirect() {
        // Forward to static index.html
        return "forward:/index.html";
    }
}
