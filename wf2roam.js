#! /usr/bin/env node
// const WorkFlowy = require('opusfluxus') // TODO switch back
const WorkFlowy = require('/home/malcolm/dev/opusfluxus/')
const fs = require('fs')

const format = (string, options, options={}) => {
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
    string = string.replace(/^([*_]{2,4})?<u>/g, '$1--- ')
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
      children: node.ch.map(node => wfNodeToRoamBlock(node)),
      'edit-time': wfLmToRoamEditTime(node.lm),
      // 'create-time' will be same as edit time (wf doesn't track separately)
    }
    if (node.no) {
      block.string+='\n'+format(node.no, options)
    }
    // ideas:
    return block  
  }

  wfNodeToRoamPage = node => {
    const page = {
      title: format(node.nm, options),
      children: node.ch.map(node => wfNodeToRoamBlock(node)),
    }
    if (node.no) {
      page.children.unshift({
        string: format(node.no, options),
        'edit-time': wfLmToRoamEditTime(node.lm)
      })
    }
  }

  return pageNodes.map(node => wfNodeToRoamPage(node))
}


function convertJsonObject (obj, user) {
  return wfToRoam(obj, user)
}

function convertInitializationDataFile (initdata) {
  if (initdata.projectTreeData && initdata.projectTreeData.mainProjectTreeInfo) {
    const mpti = initdata.projectTreeData.mainProjectTreeInfo
    return wfToRoam(mpti.rootProjectChildren, mpti.dateJoinedTimestampInSeconds)
  }
}

async function readFileToJson (path) {
  return fs.promises.readFile(path)
}

async function writeJsonToFile (path, json) {
  console.log("writing JSON to " + path)
  return fs.promises.writeFile(path, JSON.stringify(json))
}

// function convertJsonFile (inputPath, user, outputPath) {
// 
// }

async function fetchForSessionId (sessionid) {
  const wf = new WorkFlowy({sessionid: sessionid})
  await wf.refresh()


  .then()
}

function auth () {
  return WorkFlowy.cli()
}

async function wf2roam_cli () {
  const argv = require('minimist')(process.argv.slice(2))
  let roamJson = ''
  if (argv._[0] == 'auth') {
    auth()
  } else if (argv._[0] == 'initdata') {
    const initdata = await readFileToJson(argv._[1])
    roamJson = convertInitializationData(initdata)
  } else if (argv._[0] == 'sessionid') {
    const initdata = await fetchForSessionId(argv._[1])
    roamJson = convertInitializationData(initdata)
  }

  if (argv.o || argv.output) {
    // TODO: confirm overwrite if exists
    await writeJsonToFile(argv.o || argv.output, roamJson)
  } else {
    console.log('roamJson', roamJson)
  }
}

if (require.main === module) { // called directly
  wf2roam_cli()
} else {
  exports.auth = auth
  exports.wfToRoam = wfToRoam
  exports.convertJsonObject = convertJsonObject
  exports.convertInitializationDataFile = convertInitializationDataFile
  exports.convertAllForSessionId = convertAllForSessionId
}
