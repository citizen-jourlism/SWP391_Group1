package com.example.citizen_journalism;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CitizenJournalismApplication {

	public static void main(String[] args) {
		SpringApplication.run(CitizenJournalismApplication.class, args);
	}

}
