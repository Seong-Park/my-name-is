"""Extract the committed official KMA July 2026 workbook; requires openpyxl."""
import hashlib
import io
import json
from pathlib import Path
from zipfile import ZipFile
import openpyxl

source = Path(__file__).parent / 'kma-2607.zip'
with ZipFile(source) as archive:
    workbook_name = next(name for name in archive.namelist() if name.endswith('.xlsx'))
    workbook = openpyxl.load_workbook(io.BytesIO(archive.read(workbook_name)), read_only=True, data_only=True)
    rows = list(workbook.active.values)[1:]
    region_rows = [row for row in rows if row[0] == 'kor' and row[2] and not row[3] and str(row[1]).endswith('00000000')]
    region_ids = {row[2]: str(row[1]) for row in region_rows}
    districts = [row for row in rows if row[0] == 'kor' and row[3] and not row[4] and row[2] in region_ids]
    regions = [[str(row[1]), row[2]] for row in region_rows]
    locations = [[str(row[1]), region_ids[row[2]], row[3], float(row[14]), float(row[13])] for row in districts]

def array_lines(values):
    return '\n'.join('  ' + json.dumps(value, ensure_ascii=False) + ',' for value in values)

output = '// Generated from source/kma-2607.zip by source/generate.py. See SOURCES.md.\n'
output += 'export const regionData: readonly (readonly [string, string])[] = [\n' + array_lines(regions) + '\n];\n\n'
output += 'export const locationData: readonly (readonly [string, string, string, number, number])[] = [\n' + array_lines(locations) + '\n];\n'
(source.parent.parent / 'locations-data.ts').write_text(output, encoding='utf-8')
print(f'{len(regions)} regions, {len(locations)} districts; ZIP SHA256 {hashlib.sha256(source.read_bytes()).hexdigest()}')
