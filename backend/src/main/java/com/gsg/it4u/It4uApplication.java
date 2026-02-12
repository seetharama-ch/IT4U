package com.gsg.it4u;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.stereotype.Component;

@SpringBootApplication
@EnableScheduling
@org.springframework.scheduling.annotation.EnableAsync
public class It4uApplication {

	public static void main(String[] args) {
		SpringApplication.run(It4uApplication.class, args);
	}

	/**
	 * Startup guard to log critical configuration status
	 */
	@Component
	@Slf4j
	static class MailConfigStartupLogger implements ApplicationRunner {

		@Value("${it4u.mail.enabled:false}")
		private boolean mailEnabled;

		@Value("${spring.mail.host:NOT_SET}")
		private String mailHost;

		@Value("${spring.mail.username:NOT_SET}")
		private String mailUsername;

		@Value("${notifications.sender-address:NOT_SET}")
		private String senderAddress;

		@Override
		public void run(ApplicationArguments args) {
			log.info("═══════════════════════════════════════════════════════════");
			log.info("  MAIL SERVICE CONFIGURATION STATUS");
			log.info("═══════════════════════════════════════════════════════════");
			log.info("  Mail Enabled:    {}", mailEnabled);
			log.info("  SMTP Host:       {}", mailHost);
			log.info("  SMTP Username:   {}", mailUsername);
			log.info("  Sender Address:  {}", senderAddress);
			log.info("═══════════════════════════════════════════════════════════");

			if (!mailEnabled) {
				log.warn("⚠️  WARNING: Mail service is DISABLED! Users will NOT receive email notifications.");
			} else {
				log.info("✅ Mail service is ENABLED. Email notifications will be sent for ticket events.");
			}
		}
	}

}
