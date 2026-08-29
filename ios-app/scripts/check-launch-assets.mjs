#!/usr/bin/env node
/**
 * Guardrail: fail CI if the native iOS launch screen regresses to the
 * default Capacitor splash, loses its LaunchLogo assets, or drops the
 * accessibility identifier used by automated screenshot checks.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const iosRoot = resolve(here, '..', 'ios', 'App', 'App')
const storyboardPath = join(iosRoot, 'Base.lproj', 'LaunchScreen.storyboard')
const assetsPath = join(iosRoot, 'Assets.xcassets')
const launchLogoPath = join(assetsPath, 'LaunchLogo.imageset')

const BRAND_RGB = { red: 0.6588235294117647, green: 0.7215686274509804, blue: 0.5803921568627451 }
const errors = []

if (!existsSync(storyboardPath)) {
  errors.push(`Missing launch screen storyboard: ${storyboardPath}`)
} else {
  const xml = readFileSync(storyboardPath, 'utf8')

  if (/\bSplash\b/.test(xml.replace(/SplashScreen/g, ''))) {
    errors.push('LaunchScreen.storyboard still references the removed "Splash" image asset.')
  }
  if (!xml.includes('image="LaunchLogo"')) {
    errors.push('LaunchScreen.storyboard does not reference the "LaunchLogo" image asset.')
  }
  if (!/identifier="LaunchLogo"/.test(xml)) {
    errors.push('LaunchScreen.storyboard logo image view is missing accessibilityIdentifier="LaunchLogo".')
  }

  const bg = xml.match(/<color key="backgroundColor"([^/]*)\/>/)
  if (!bg) {
    errors.push('LaunchScreen.storyboard root view has no backgroundColor.')
  } else {
    for (const [channel, expected] of Object.entries(BRAND_RGB)) {
      const found = bg[1].match(new RegExp(`${channel}="([\\d.]+)"`))
      const value = found ? Number(found[1]) : NaN
      if (!Number.isFinite(value) || Math.abs(value - expected) > 0.002) {
        errors.push(`LaunchScreen background ${channel} is ${found ? found[1] : 'missing'}; expected #A8B894 (${expected.toFixed(4)}).`)
      }
    }
  }
}

if (existsSync(join(assetsPath, 'Splash.imageset'))) {
  errors.push('Splash.imageset has reappeared in Assets.xcassets; the Capacitor splash artwork must stay removed.')
}

const contentsPath = join(launchLogoPath, 'Contents.json')
if (!existsSync(contentsPath)) {
  errors.push(`Missing ${contentsPath}`)
} else {
  let contents
  try {
    contents = JSON.parse(readFileSync(contentsPath, 'utf8'))
  } catch (error) {
    errors.push(`LaunchLogo.imageset/Contents.json is not valid JSON: ${error.message}`)
  }
  if (contents) {
    const images = Array.isArray(contents.images) ? contents.images : []
    const scales = new Set(images.map((image) => image.scale))
    for (const scale of ['1x', '2x', '3x']) {
      if (!scales.has(scale)) errors.push(`LaunchLogo.imageset is missing a ${scale} entry.`)
    }
    for (const image of images) {
      if (!image.filename) {
        errors.push(`LaunchLogo.imageset ${image.scale ?? 'entry'} has no filename.`)
        continue
      }
      if (!existsSync(join(launchLogoPath, image.filename))) {
        errors.push(`LaunchLogo.imageset declares "${image.filename}" but the file is missing on disk.`)
      }
    }
    const declared = new Set(images.map((image) => image.filename).filter(Boolean))
    for (const file of readdirSync(launchLogoPath)) {
      if (file.endsWith('.png') && !declared.has(file)) {
        errors.push(`LaunchLogo.imageset contains unreferenced file "${file}".`)
      }
    }
  }
}

if (errors.length > 0) {
  console.error('Launch screen asset check failed:\n')
  for (const error of errors) console.error(`  - ${error}`)
  console.error('')
  process.exit(1)
}

console.log('Launch screen asset check passed: branded LaunchScreen + LaunchLogo 1x/2x/3x present, no Capacitor splash.')
