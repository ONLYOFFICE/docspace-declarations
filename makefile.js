import {argv} from "node:process"
import {existsSync} from "node:fs"
import {fileURLToPath} from "node:url"
import {join} from "node:path"
import {mkdir, writeFile} from "node:fs/promises"
import {OpenAPIV3 as OpenApi} from "openapi-types"
import sade from "sade"

const config = {
    source: {
      owner: "onlyoffice",
      repo: "docspace-declarations",
      reference: "src",
      paths: [
        {name: "data", path: "asc.data.backup.swagger.json"},
        {name: "files", path: "asc.files.swagger.json"},
        {name: "people", path: "asc.people.swagger.json"},
        {name: "web", path: "asc.web.api.swagger.json"},
      ],
    },
}

main()

/**
 * @returns {void}
 */
function main() {
  sade("./makefile.js")
    .command("build")
    .action(build)
    .parse(argv)
}

/**
 * @returns {Promise<void>}
 */
async function build(){
    const c = config.source

    const rd = rootDir()

    const dd = distDir(rd)
    if (!existsSync(dd)) {
        await mkdir(dd)
    }
    //TODO: console info?
    for (const p of c.paths){
        const u = `https://raw.githubusercontent.com/${c.owner}/${c.repo}/${c.reference}/${p.path}`
        const r = await (await fetch(u)).json()
        patch(r)
        const dp = join(dd, p.path)
        const ds = JSON.stringify(r, null, 2)
        await writeFile(dp, ds)
    }
}

/**
 * @param {OpenApi.Document<{}>} d
 * @returns {void}
 */
function patch(d) {
  for (const pn in d.paths){
    const po = d.paths[pn]
    if (!po) {
      continue
    }

    // https://github.com/ONLYOFFICE/DocSpace-server/blob/v2.0.2-server/web/ASC.Web.Api/Api/CapabilitiesController.cs#L33
    if (pn.endsWith("{.format}")) {
      delete d.paths[pn]
      continue
    }

    for (const mn of Object.values(OpenApi.HttpMethods)) {
      const mo = po[mn]
      if (!mo) {
        continue
      }

      if (mo.description) {
        mo.description = `**Note**: ${mo.description}`
      }

      if (mo.summary) {
        if (!mo.description) {
          mo.description = mo.summary
        } else {
          mo.description = `${mo.summary}\n\n${mo.description}`
        }
      }

      if ("x-shortName" in mo && typeof mo["x-shortName"] === "string") {
        mo.summary = mo["x-shortName"]
      }
    }
  }
}

/**
 * @returns {string}
 */
function rootDir() {
    const u = new URL(".", import.meta.url)
    return fileURLToPath(u)
}

/**
 * @param {string} d
 * @returns {string}
*/
function distDir(d) {
    return join(d, "dist")
}
