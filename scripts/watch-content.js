const chokidar = require('chokidar')
const fs = require('fs')
const path = require('path')
const exec = require('util').promisify(require('child_process').exec)
// Local files for handling KV storage and cache.
// cache.json is inside app to trigger Hot Module Reloading on changes.
const cacheFilePath = `.${path.sep}app${path.sep}.cache.json`
// console.log("Cache file path", cacheFilePath)

;(async function () {
    await main()
})()

async function main() {
    // read from cache
    let cache = {}
    if (fs.existsSync(cacheFilePath)) {
        cache = JSON.parse(fs.readFileSync(cacheFilePath))
    }
    console.log('Cache', cache)

    chokidar.watch('./app/components', {}).on('all', async (event, _) => {
        if (event !== 'change') return
        fs.rmSync(cacheFilePath, { force: true })
        const filelist = []
        function walk(dir) {
            const files = fs.readdirSync(dir)
            files.forEach(async (file) => {
                const filePath = path.join(dir, file)
                if (fs.statSync(filePath).isDirectory()) {
                    walk(filePath)
                } else {
                    const res = await doCompile(filePath)
                    const lastModified = fs.statSync(filePath).mtimeMs
                    console.log('______________', filePath)
                    updateCache(cache, filePath, {
                        lastModified: lastModified,
                        hash: res?.hash,
                    })
                }
            })
        }
        walk('./content')
    })
    try {
        chokidar
            .watch('./content', {})
            .on('all', async (event, contentPath) => {
                if (event === 'addDir') return
                console.log('Listening to:', contentPath)
                const { match, dir, file } = validContentPath(contentPath)
                if (!match) return
                const lastModified = fs.statSync(contentPath).mtimeMs
                // IF cached content has changed. Compile the mdx file.
                if (
                    cache[contentPath] &&
                    cache[contentPath].lastModified === lastModified
                ) {
                    // Early return if no change.
                    return
                }
                console.log('before  compile')
                try {
                    console.time(`Time to Compile ${contentPath}`)
                    const results = await doCompile(contentPath)
                    console.log('compiled', contentPath, results)
                    const res = results?.[contentPath]

                    console.log('before update cacche', res?.hash, lastModified)
                    if (lastModified && res?.hash) {
                        console.log('updating cache')
                        updateCache(cache, contentPath, {
                            lastModified,
                            hash: res?.hash,
                        })
                    }
                    console.timeEnd(`Time to Compile ${contentPath}`)
                } catch (e) {
                    console.log('Failed to compile', e)
                }
            })
    } catch (e) {
        console.error(e)
    }
}

function updateCache(cache, path, entry) {
    cache[path] = entry
    fs.writeFileSync(cacheFilePath, JSON.stringify(cache, null, 2))
}

async function doCompile(contentPath) {
    console.log(`Compiling ${contentPath}...`)
    const command = `cd scripts/mdx && node compile-mdx.js --root ../.. --json --file ${contentPath}`
    let out = await exec(command).catch((e) => {
        return e
    })
    if (out.stderr) {
        console.error('ERROR COMPILING', out.stderr)
        return
    }

    // console.error("stdout", out.stdout)
    return JSON.parse(out.stdout)
}

function validContentPath(contentPath) {
    const _contentPath = contentPath.replaceAll(path.sep, '/')
    const match = /\/?(?<dir>content\/(?:.*))\/(?<file>[^.]+\.mdx)$/gm.exec(
        _contentPath
    )
    console.log('valid file path', contentPath, match)
    if (!match) return { match: false }
    const { dir, file } = match.groups
    return { match: true, dir: dir.replaceAll('/', path.sep), file }
}
