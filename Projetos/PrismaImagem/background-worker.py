"""Local-only background removal. JSON over stdin/stdout; no API credentials."""
import os, sys, json, base64, io
from pathlib import Path

module = Path(__file__).resolve().parent
root = module.parent if module.name == 'app' else module
os.environ['U2NET_HOME'] = str(root / 'data' / 'background-models')
os.environ['NUMBA_CACHE_DIR'] = str(root / 'data' / 'numba-cache')
os.environ['XDG_CACHE_HOME'] = str(root / 'data' / 'tool-cache')
sys.path.insert(0, str(root / 'runtime' / 'image-tools'))

def run():
    if not (root / 'data' / 'background-models' / 'u2net.onnx').is_file():
        raise RuntimeError('NOT_INSTALLED')
    from rembg import remove, new_session
    from PIL import Image, ImageOps
    payload = json.loads(sys.stdin.buffer.readline(15 * 1024 * 1024))
    raw = base64.b64decode(payload['image'], validate=True)
    Image.MAX_IMAGE_PIXELS = 20_000_000
    with Image.open(io.BytesIO(raw)) as source:
        if source.width * source.height > 20_000_000:
            raise RuntimeError('IMAGE_TOO_LARGE')
        session = new_session('u2net', providers=['CPUExecutionProvider'])
        output = remove(ImageOps.exif_transpose(source).convert('RGBA'), session=session)
        target = io.BytesIO()
        output.save(target, format='PNG')
        print(json.dumps({'image':base64.b64encode(target.getvalue()).decode('ascii'),'size':f'{output.width}x{output.height}'}))

if __name__ == '__main__':
    try:
        if '--install' in sys.argv:
            from rembg import new_session
            new_session('u2net', providers=['CPUExecutionProvider'])
            print(json.dumps({'installed':True}))
        else: run()
    except (ImportError, ModuleNotFoundError):
        print(json.dumps({'error':'NOT_INSTALLED'})); sys.exit(2)
    except Exception as error:
        print(json.dumps({'error':str(error) if str(error) in ['NOT_INSTALLED','IMAGE_TOO_LARGE'] else 'PROCESSING_FAILED'})); sys.exit(1)
