from __future__ import annotations

import argparse
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.parse import urlparse

import polars as pl

from bos_quant import compute_bos_scores


class QuantService(BaseHTTPRequestHandler):
    server_version = "BuyOrSellQuant/4.0"

    def do_GET(self) -> None:
        if urlparse(self.path).path == "/health":
            self._json(200, {"ok": True, "service": "quant-rag-engine"})
            return
        self._json(404, {"ok": False, "error": "not_found"})

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        if path != "/score":
            self._json(404, {"ok": False, "error": "not_found"})
            return
        try:
            body = self._read_json()
            rows = body.get("rows", [])
            scores = compute_bos_scores(pl.DataFrame(rows)).to_dicts()
            self._json(200, {"ok": True, "data_degraded": False, "data": scores})
        except Exception as error:
            self._json(400, {"ok": False, "data_degraded": True, "error": str(error)})

    def log_message(self, format: str, *args: Any) -> None:
        return

    def _read_json(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length") or "0")
        if length <= 0:
            return {}
        raw = self.rfile.read(length).decode("utf-8")
        return json.loads(raw or "{}")

    def _json(self, status: int, payload: dict[str, Any]) -> None:
        data = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


def main() -> None:
    parser = argparse.ArgumentParser(description="BuyOrSell Quant/RAG HTTP service")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    server = ThreadingHTTPServer((args.host, args.port), QuantService)
    server.serve_forever()


if __name__ == "__main__":
    main()
