#!/usr/bin/env bash
set -euo pipefail
speech_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../services/qiroah-speech" && pwd)"
if [[ ! -x "$speech_dir/.venv/bin/python" ]]; then
  printf '%s\n' 'Layanan suara belum dipasang. Jalankan npm run speech:setup dahulu.' >&2
  exit 1
fi
export QIROAH_MODEL_PATH="${QIROAH_MODEL_PATH:-$speech_dir/model}"
cd "$speech_dir"
exec .venv/bin/python -m uvicorn app:app --host 127.0.0.1 --port 8891 --no-access-log
