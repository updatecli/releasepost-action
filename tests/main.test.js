import path from 'node:path'
import url from 'node:url'
import {promises as fs} from 'node:fs'
import {
  run,
  releasepostDownload,
  releasepostVersion,
  releasepostExtract,
} from 'src/main'
import {ExitCode} from '@actions/core'
import yaml from 'js-yaml'

const directory = path.dirname(url.fileURLToPath(import.meta.url))

const cachePath = path.join(directory, 'CACHE')
const temporaryPath = path.join(directory, 'TEMP')
// Set temp and tool directories before importing (used to set global state)
process.env['RUNNER_TEMP'] = temporaryPath
process.env['RUNNER_TOOL_CACHE'] = cachePath

// Read action.yaml file to get the version
const actionYaml = yaml.load(
  await fs.readFile(path.join(directory, '../action.yaml'))
)
const version = actionYaml.inputs.version.default
const versionWithoutV = version.slice(1)

process.env['INPUT_VERSION'] = version
const originalPlatform = process.platform
const originalArch = process.arch

const restorePlatformArch = () => {
  Object.defineProperty(process, 'platform', {
    value: originalPlatform,
  })
  Object.defineProperty(process, 'arch', {
    value: originalArch,
  })
}
const fakePlatformArch = (fakePlatform, fakeArch) => {
  Object.defineProperty(process, 'platform', {
    value: fakePlatform,
  })
  Object.defineProperty(process, 'arch', {
    value: fakeArch,
  })
}

describe('main', () => {
  it('run', async () => {
    await run()
    const file = path.join(
      cachePath,
      'releasepost',
      versionWithoutV,
      process.arch,
      'releasepost'
    )
    const fileStat = await fs.stat(file)
    expect(fileStat.isFile()).toBe(true)
    expect(process.exitCode).toBe(ExitCode.Success)
  })

  it('unknown extract', async () => {
    await expect(
      releasepostExtract('/tmp/foo', 'foo.bar')
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Unsupported archive type: foo.bar"`
    )
  })

  it('releasepost not found', async () => {
    const path = process.env['PATH']
    process.env['PATH'] = ''
    await expect(
      releasepostVersion()
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Unable to locate executable file: releasepost. Please verify either the file path exists or the file can be found within a directory specified by the PATH environment variable. Also check the file mode to verify the file is executable."`
    )
    process.env['PATH'] = path
  })

  it('linux should download', async () => {
    fakePlatformArch('linux', 'x64')
    await releasepostDownload()
    const file = path.join(
      cachePath,
      'releasepost',
      versionWithoutV,
      process.arch,
      'releasepost'
    )
    const fileStat = await fs.stat(file)
    expect(fileStat.isFile()).toBe(true)
    restorePlatformArch()
  })

  it('windows should download', async () => {
    fakePlatformArch('win32', 'x64')
    await releasepostDownload()
    const file = path.join(
      cachePath,
      'releasepost',
      versionWithoutV,
      process.arch,
      'releasepost.exe'
    )
    const fileStat = await fs.stat(file)
    expect(fileStat.isFile()).toBe(true)
    restorePlatformArch()
  })

  it('darwin should download', async () => {
    fakePlatformArch('darwin', 'x64')
    await releasepostDownload()
    const file = path.join(
      cachePath,
      'releasepost',
      versionWithoutV,
      process.arch,
      'releasepost'
    )
    const fileStat = await fs.stat(file)
    expect(fileStat.isFile()).toBe(true)
    restorePlatformArch()
  })
})

afterAll(async () => {
  await fs.rm(temporaryPath, {recursive: true})
  await fs.rm(cachePath, {recursive: true})
})
