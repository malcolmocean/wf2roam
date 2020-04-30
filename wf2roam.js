#! /usr/bin/env node
// const WorkFlowy = require('opusfluxus') // TODO switch back
const WorkFlowy = require('/home/malcolm/dev/opusfluxus/index.js')
const fs = require('fs')

const format = (string, options={}) => {
  // convert <b><i>X</i></b> // workflowy seems to prefer this order
  //       & <i><b>X</b></i>
  //      to   **__X__**     // roam only supports this order
  string = string.replace(/<b><i>/g, '**__')
  string = string.replace(/<i><b>/g, '**__')
  string = string.replace(/<\/b><\/i>/g, '__**')
  string = string.replace(/<\/i><\/b>/g, '__**')

  // convert <b>X</b> to **X**
  string = string.replace(/<\/?b>/g, '**')

  // convert <i>X</i> to __X__
  string = string.replace(/<\/?i>/g, '__')

  if (options.underlineToHyphens) { // if using underlines for list headers
    string = string.replace(/^<u>/g, '--- ')
    string = string.replace(/<\/u>$/g, ' ---')
    string = string.replace(/^([*_]{2,4})?<u>/g, '$1--- ') // if ^<b><i><u>, which workflowy seems to prefer
    string = string.replace(/<\/u>([*_]{2,4})$/g, ' ---$1')
  }
  if (options.underlineToHighlight) { // some folks have a userstyle to do this
    string = string.replace(/<\/?u>/g, '^^')
  } else {            // otherwise... roam doesn't support underline, so I guess chuck it
    string = string.replace(/<\/?u>/g, '')
  }

  // fwiw, this could still result in something roam can't read, eg
    // this:  <i>italic with <b>bold</b> inside</i>
    // becomes: __italic with **bold** inside__
    // which breaks 

  // unescape special chars
  string = string.replace(/&gt;/g, '>')
  string = string.replace(/&lt;/g, '<')
  string = string.replace(/&amp;/g, '&')
  return string
}

function wfToRoam (pageNodes, dateJoinedTimestampInSeconds, options={}) {
  if (!pageNodes.length && pageNodes.nm) {pageNodes = [pageNodes]}

  // wf last modified is measured as seconds since user joined
  // roam editStamp is measured as millis since unix epoch
  const wfLmToRoamEditTime = lm => {
    return (lm + dateJoinedTimestampInSeconds) * 1000
  }

  const wfNodeToRoamBlock = node => {
    const block = {
      string: format(node.nm, options),
      uid: node.id,
      'edit-time': wfLmToRoamEditTime(node.lm),
      // 'create-time' will be same as edit time (wf doesn't track separately)
    }

    if (node.ch && node.ch.length) {
      block.children = node.ch.map(node => wfNodeToRoamBlock(node))
    }
    if (node.no) {
      block.string+='\n'+format(node.no, options)
    }
    return block  
  }

  wfNodeToRoamPage = node => {
    const page = {
      title: format(node.nm, options),
    }
    if (node.ch && node.ch.length) {
      page.children = node.ch.map(node => wfNodeToRoamBlock(node))
    }
    if (node.no) {
      page.children.unshift({
        string: format(node.no, options),
        'edit-time': wfLmToRoamEditTime(node.lm)
      })
    }
    return page
  }

  return pageNodes.map(node => wfNodeToRoamPage(node))
}


function convertJsonObject (obj, user) {
  return wfToRoam(obj, user)
}

function convertInitializationData (initdata) {
  if (initdata.projectTreeData && initdata.projectTreeData.mainProjectTreeInfo) {
    const mpti = initdata.projectTreeData.mainProjectTreeInfo
    const nPages = mpti.rootProjectChildren.length
    console.log(`${nPages} pages will be made from ${nPages} top-level workflowy nodes`)
    return wfToRoam(mpti.rootProjectChildren, mpti.dateJoinedTimestampInSeconds)
  } else {
    throw new Error("invalid initialization data")
  }
}

async function readFileToJson (path) {
  return fs.promises.readFile(path)
}

async function writeJsonToFile (path, json) {
  console.log("writing JSON to " + path)
  return fs.promises.writeFile(path, JSON.stringify(json))
}

async function fetchInitdataForSessionId (sessionid) {
  const wf = new WorkFlowy({sessionid: sessionid})
  await wf.refresh()
  return wf.meta
}

function auth () {
  return WorkFlowy.cli()
}

function convertSearchToFunction (search) {
  if (!search) {
    throw "invalid search"
  } else if (typeof search == 'function') {
    return search
  } else if (typeof search == 'string') {
    return node => node.nm === search
  } else if (search instanceof RegExp) {
    return node => search.test(node.nm)
  }
}

/* breadth first search because projects are more likely to be higher in the tree */
function findNode (topLevelNodes, search) {
  search = convertSearchToFunction(search)
  if (!topLevelNodes.length && topLevelNodes.nm) {topLevelNodes = [topLevelNodes]}
  const queue = [].concat(topLevelNodes)
  let node
  while (node = queue.shift()) {
    if (node && search(node)) {
      return node
    } else if (node && node.ch && node.ch.length) {
      queue.push(...node.ch)
    }
  }
}

async function wf2roam_cli () {
  const argv = require('minimist')(process.argv.slice(2))
  const command = argv._[0]
  const extra = argv._[1]
  if (command == 'auth') {
    return auth()
  }

  let sessionid
  if (command == 'sessionid') {
    sessionid = extra
  } else if (command == 'useWfConfig') {
    sessionid = await WorkFlowy.loadWfConfig().sessionid
  } else {
    const sessionid = await auth()
  }
  console.log("sessionid", sessionid)
  let initdata
  if (command == 'initdata') {
    initdata = await readFileToJson(extra)
  } else if (sessionid) {
    initdata = await fetchInitdataForSessionId(sessionid)
  }

  console.log("argv.wfid", argv.wfid)
  if (argv.wfid) {
    const tree = initdata.projectTreeData.mainProjectTreeInfo.rootProjectChildren
    const search = node => node.id.endsWith(argv.wfid)
    const found = findNode(tree, search)
    const pages = argv.ch ? found.ch : [found]
    initdata.projectTreeData.mainProjectTreeInfo.rootProjectChildren = pages
  }

  let roamJson
  if (initdata) {
    console.log("got workflowy data")
    roamJson = convertInitializationData(initdata)
  } else {
    return console.log("No valid initialization data found.")
  }

  if (argv.o || argv.output) {
    // LATER: confirm overwrite if exists
    await writeJsonToFile(argv.o || argv.output, roamJson)
  } else {
    console.log('roamJson', roamJson)
  }
}

if (require.main === module) { // called directly
  wf2roam_cli()
  .catch(err => {
    console.log('\x1b[33m')//, 'Error')
    console.log(err)
    console.log('\x1b[0m')
  })
} else {
  exports.auth = auth
  exports.wfToRoam = wfToRoam
  exports.convertJsonObject = convertJsonObject
  exports.convertInitializationDataFile = convertInitializationDataFile
  exports.convertAllForSessionId = convertAllForSessionId
}
