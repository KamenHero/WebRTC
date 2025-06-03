up:
	docker-compose up --build 

down:
	docker-compose down -v

clear:
	docker system prune -af