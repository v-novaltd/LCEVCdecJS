# Python file to concatenate js files
import sys
import shutil
import time
from os.path import exists

print('Concatenation script running.')

# Copy DPI wasm into the dist folder
shutil.copyfile('liblcevc/liblcevc_dpi.wasm', 'dist/liblcevc_dpi.wasm')

# Append DPI.js to the start of LCEVCdec.js
build_type = sys.argv[1]
dpi_source = dec_source = ''

dpi_file = 'liblcevc/liblcevc_dpi.js'
dec_file = 'dist/lcevc_dec.min.js' if build_type == 'prod' else 'dist/lcevc_dec.js'

while not exists(dec_file):
    print('The dec_file does not exist. Retrying.')
    time.sleep(1)

with open(dpi_file) as f:
    dpi_source = f.read()

with open(dec_file) as f:
    dec_source = f.read()

with open(dec_file, 'w') as f:
    f.write(dpi_source + "\n" + dec_source)
