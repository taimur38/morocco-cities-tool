import { asyncBufferFromUrl, parquetReadObjects } from 'hyparquet';

// Reads a parquet file served from /public/data/ into an array of row objects.
// hyparquet returns INT64 columns as bigint by default; population/worker counts
// fit comfortably in Number, so we coerce row-by-row to keep arithmetic ergonomic.
export async function loadParquet<T>(path: string): Promise<T[]> {
  const url = new URL(path, window.location.origin).toString();
  const file = await asyncBufferFromUrl({ url });
  const rows = await parquetReadObjects({ file });
  return rows.map(coerceBigints) as T[];
}

function coerceBigints(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k in row) {
    const v = row[k];
    out[k] = typeof v === 'bigint' ? Number(v) : v;
  }
  return out;
}
