package main

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrDuplicateEmail = errors.New("email already exists")

type User struct {
	ID       string
	Email    string
	Password string
}

func CreateUser(ctx context.Context, pool *pgxpool.Pool, email, hashedPassword string) (User, error) {
	var u User
	err := pool.QueryRow(ctx,
		`INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email`,
		email, hashedPassword,
	).Scan(&u.ID, &u.Email)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return User{}, ErrDuplicateEmail
		}
		return User{}, err
	}
	return u, nil
}

func GetUserByEmail(ctx context.Context, pool *pgxpool.Pool, email string) (User, error) {
	var u User
	err := pool.QueryRow(ctx,
		`SELECT id, email, password FROM users WHERE email = $1`,
		email,
	).Scan(&u.ID, &u.Email, &u.Password)
	if err != nil {
		return User{}, err
	}
	return u, nil
}
