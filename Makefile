
.PHONY: test
test:
	docker-compose up --build
	open coverage/index.html

.PHONY: clean
clean:
	-rm -rf ./coverage ./node_modules
