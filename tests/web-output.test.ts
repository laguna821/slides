import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { verifyWebOutput } from '../scripts/verify-web-output';

async function fixture(html: string, check: (root: string) => Promise<void>) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'slides-output-'));
  try {
    await fs.writeFile(path.join(root, 'index.html'), html);
    await check(root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}
test('deployed broken local link fails the output gate', async () => {
  await fixture('<a href="/missing.html">Open</a>', async (root) => {
    await assert.rejects(verifyWebOutput(root, root), /Broken deployed link/);
  });
});
test('new unregistered remote image fails the output gate', async () => {
  await fixture('<img src="https://example.org/new.png">', async (root) => {
    await assert.rejects(
      verifyWebOutput(root, root),
      /Unregistered remote image/,
    );
  });
});
test('oversized HTML and embedded image fail the output gate', async () => {
  await fixture('<p>' + 'x'.repeat(2 * 1024 * 1024) + '</p>', async (root) => {
    await assert.rejects(verifyWebOutput(root, root), /HTML exceeds/);
  });
  await fixture('<img src="data:image/png;base64,YQ==">', async (root) => {
    await assert.rejects(verifyWebOutput(root, root), /Embedded asset/);
  });
});
