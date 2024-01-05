import core from '@actions/core'
import tool from '@actions/tool-cache'
import exec from '@actions/exec'
import path from 'node:path'

export async function releasepostExtract(downloadPath, downloadUrl) {
  if (downloadUrl.endsWith('.tar.gz')) {
    return tool.extractTar(downloadPath)
  } else if (downloadUrl.endsWith('.zip')) {
    return tool.extractZip(downloadPath)
  } else {
    throw new Error(`Unsupported archive type: ${downloadUrl}`)
  }
}

// downloadReleasepost retrieve releasepost binary from Github Release
export async function releasepostDownload() {
  const version = core.getInput('version')

  const releasepostPackages = [
    {
      arch: 'x64',
      platform: 'linux',
      url: `https://github.com/updatecli/releasepost/releases/download/${version}/releasepost_Linux_x86_64.tar.gz`,
    },
    {
      arch: 'arm64',
      platform: 'linux',
      url: `https://github.com/updatecli/releasepost/releases/download/${version}/releasepost_Linux_arm64.tar.gz`,
    },
    {
      arch: 'x64',
      platform: 'win32',
      url: `https://github.com/updatecli/releasepost/releases/download/${version}/releasepost_Windows_x86_64.zip`,
    },
    {
      arch: 'arm64',
      platform: 'win32',
      url: `https://github.com/updatecli/releasepost/releases/download/${version}/releasepost_Windows_arm64.zip`,
    },
    {
      arch: 'x64',
      platform: 'darwin',
      url: `https://github.com/updatecli/releasepost/releases/download/${version}/releasepost_Darwin_x86_64.tar.gz`,
    },
    {
      arch: 'arm64',
      platform: 'darwin',
      url: `https://github.com/updatecli/releasepost/releases/download/${version}/releasepost_Darwin_arm64.tar.gz`,
    },
  ]

  const releasepostPackage = releasepostPackages.find(
    x => x.platform == process.platform && x.arch == process.arch
  )
  if (!releasepostPackage) {
    throw new Error(
      `Unsupported platform ${process.platform} and arch ${process.arch}`
    )
  }

  core.info(`Downloading ${releasepostPackage.url}`)
  const downloadPath = await tool.downloadTool(releasepostPackage.url)

  core.debug(`Extracting file ${downloadPath} ...`)
  const releasepostExtractedFolder = await releasepostExtract(
    downloadPath,
    releasepostPackage.url
  )
  core.debug(`Extracted file to ${releasepostExtractedFolder} ...`)

  core.debug('Adding to the cache ...')
  const cachedPath = await tool.cacheDir(
    releasepostExtractedFolder,
    'releasepost',
    version,
    process.arch
  )

  if (process.platform == 'linux' || process.platform == 'darwin') {
    await exec.exec('chmod', ['+x', path.join(cachedPath, 'releasepost')])
  }

  core.addPath(cachedPath)

  core.info(`Downloaded to ${cachedPath}`)
}

export async function releasepostVersion() {
  core.info('Show Releasepost version')
  await exec.exec('releasepost version')
}

export async function run() {
  try {
    await releasepostDownload()
    await releasepostVersion()
    process.exitCode = core.ExitCode.Success
  } catch (error) {
    core.setFailed(error.message)
  }
}
