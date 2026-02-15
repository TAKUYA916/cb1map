from flaskimport Flask, request, send_from_directory
import json, os

app = Flask(__name__, static_folder="public")

DATA_FILE ="data.json"

# ---------- HTML配信 ----------
@app.route("/")
defroot():
return send_from_directory("public","index.html")


# ---------- 保存API ----------
@app.post("/save")
defsave():
withopen(DATA_FILE,"w", encoding="utf-8")as f:
        f.write(request.data.decode("utf-8"))
return {"status":"ok"}


# ---------- 読み込みAPI ----------
@app.get("/load")
defload():
ifnot os.path.exists(DATA_FILE):
return {}
withopen(DATA_FILE,"r", encoding="utf-8")as f:
return json.load(f)


# ---------- 起動 ----------
if __name__ =="__main__":
    app.run(host="0.0.0.0", port=8080)
