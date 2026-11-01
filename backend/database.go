
package main

import (
	"database/sql"
	"log"
	"os"

	_ "github.com/go-sql-driver/mysql"
)

var DB *sql.DB

func ConnectDatabase() {
	dsn := os.Getenv("DB_DSN")

	if dsn == "" {
		log.Fatal("DB_DSN environment variable is missing")
	}

	var err error
	DB, err = sql.Open("mysql", dsn)
	if err != nil {
		log.Fatal("Failed to open database:", err)
	}

	if err = DB.Ping(); err != nil {
		log.Fatal("Failed to connect to MySQL:", err)
	}

	log.Println("Connected to MySQL successfully!")
}
