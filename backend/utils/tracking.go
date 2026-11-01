package utils

import (
	"crypto/rand"
	"encoding/hex"
	"strings"
)

func GenerateTrackingNumber() (string, error) {
	bytes := make([]byte, 6)

	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}

	return "TRK" + strings.ToUpper(hex.EncodeToString(bytes)), nil
}
