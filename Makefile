up:
	docker-compose up --build

down:
	docker-compose down

init:
	npm run init:db

consumer:
	npm run start:consumer

producer:
	npm run start:producer