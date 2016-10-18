'use strict'

const Stats = require('.')
const test = require('tape')
const hyperdrive = require('hyperdrive')
const memdb = require('memdb')

const db = memdb()
const drive = hyperdrive(db)

test('create archive stats', t => {
  t.plan(6)
  const archive = drive.createArchive({ live: false })
  archive.createFileWriteStream('file').end('content')
  archive.finalize(() => {
    const stats = new Stats({ archive, db })

    stats.on('update:filesTotal', () => t.pass('filesTotal emits'))
    stats.on('update:bytesTotal', () => t.pass('bytesTotal emits'))
    stats.on('update:blocksTotal', () => t.pass('blocksTotal emits'))
    stats.on('update', () => {
      const data = stats.get()
      t.equal(data.filesTotal, 1, 'filesTotal')
      t.equal(data.blocksTotal, 1, 'blocksTotal')
      t.equal(data.bytesTotal, 7, 'bytesTotal')
    })
  })
})

test('replicate archive stats', t => {
  t.plan(7)
  const archive = drive.createArchive({ live: false })
  archive.createFileWriteStream('file').end('content')
  archive.finalize(() => {
    const dbClone = memdb()
    const driveClone = hyperdrive(dbClone)
    const archiveClone = driveClone.createArchive(archive.key)
    const stats = new Stats({ archive: archiveClone, db: dbClone })

    archiveClone.download(0, () => {
      const data = stats.get()
      t.skip('TODO: files', data.filesProgress, data.filesTotal, 'files')
      t.skip('TODO: bytes', data.bytesProgress, data.bytesTotal, 'bytes')
      t.equal(data.blocksProgress, data.blocksTotal, 'blocks')
    })

    stats.once('update:downloadSpeed', function () {
      t.ok(stats.get().downloadSpeed > 0, 'positive download speed')
    })

    stats.once('update:filesTotal', () => {
      // TODO: any way to know when stats totals are complete? do we need to?
      const data = stats.get()
      t.equal(data.filesTotal, 1, 'filesTotal')
      t.equal(data.blocksTotal, 1, 'blocksTotal')
      t.equal(data.bytesTotal, 7, 'bytesTotal')
    })

    const stream = archive.replicate()
    const streamClone = archiveClone.replicate()
    stream.pipe(streamClone).pipe(stream)
  })
})
