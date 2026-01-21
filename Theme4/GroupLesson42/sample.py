from fastapi import FastAPI

app = FastAPI()

@app.get("/") 
def my_function():
    return "Hello World!"

@app.get("/name")
def my_function2():
    return {"name": "Roman"}

@app.get("/name/{name}")
def my_function2(name:str):
    return {"name": name}