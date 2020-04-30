# wf2roam

Script for converting [WorkFlowy](https://workflowy.com) JSON into [Roam](https://roamresearch.com) import JSON. You can already easily copy-paste between WorkFlowy & Roam , but this script will preserve edit stamps and turn top-level nodes (or nodes at some other level) into their own pages.

Works as both a node module for use in other projects, as well as a command-line interface. The cli can be used in many diverse ways.

## As node module

### Install to your node project

```bash
npm install --save wf2roam
```

### Use it

```javascript
const wf2roam = require('wf2roam')
const nodes = [{
  id: '20a2fccc-14e6-8c32-ab80-d0ba4bec4787',
  nm: 'wf roam tests',
  lm: 120929766,
  ch:
   [ { id: 'ff9b5926-b0a5-ca55-36f3-7946c9918e19',
       nm: '<i>test italic</i>',
       lm: 120929769},
     { id: '432fbc98-9e0c-d5be-a3e9-684af64a24a3',
       nm: '<b>test bold</b>',
       lm: 120929764},
     { id: '26ffd132-2c2f-578f-4eaa-bffa22a9df03',
       nm: '<b><i><u>bold italic underline</u></i></b>',
       lm: 120933180}
  ]
}]
const dateJoinedTimestampInSeconds = 1467241264
const roamJson = wf2roam.convertJsonObject(nodes, dateJoinedTimestampInSeconds, options)
```

`roamJson` will be
```json
[
  {
    "title": "wf roam tests",
    "children": [
      {
        "string": "__test italic__",
        "uid": "ff9b5926-b0a5-ca55-36f3-7946c9918e19",
        "edit-time": 1588171033000
      },
      {
        "string": "**test bold**",
        "uid": "432fbc98-9e0c-d5be-a3e9-684af64a24a3",
        "edit-time": 1588171028000
      },
      {
        "string": "**__^^bold italic underline^^__**",
        "uid": "26ffd132-2c2f-578f-4eaa-bffa22a9df03",
        "edit-time": 1588174444000
      }
    ]
  }
]
```

## As command-line script

### Install as a command-line tool

```bash
npm install --global wf2roam
```

### Use it

The simplest way to use it is to run the command with `-o` for the output path, and it will guide you through authenticating with workflowy (using [opusfluxus](https://github.com/malcolmocean/opusfluxus/)) then will pull your workflowy data and convert it and save it to this file. If you omit the -o flag it will show you a preview in the console instead.

This will convert each of your top-level workflowy nodes into a roam page.

```bash
wf2roam -o roam_format_output.json
```

With the above method, your sessionid will be stored in a `~/.wfconfig` file for future uses, which is very convenient.

If for some reason you don't want to use that mode of getting your workflowy data, you can supply your own sessionid (which is a cookie set on workflowy.com) like this:

```bash
wf2roam sessionid afh983wf5yh89w3fh5
```

Or, you can provide your own data file, by scoping out the Network tab of your browser's web developer console on workflowy.com, and saving the `get_initialization_data` response as a JSON file, then running

```bash
wf2roam initdata mydata.json
```

This data includes not just the tree but also a vital piece of metadata: the moment you created your WorkFlowy account. All of the WorkFlowy "last modified" timestamps are relative to this, not to some static time. I have no clue why.

## Cool stuff

*Convert just one node into a page, or convert a node's children into a page*

Navigate to a given node in WorkFlowy, then copy the 12 digits from the url fragment after `/#/` (eg `14d48414c3c8`)

```bash
wf2roam --wfid=14d48414c3c8
```

This will convert just that node into a Roam page.

If you have a "Drafts" node in WorkFlowy and you want each of its children to be made into a Roam page, then get its id like above then run the command with the `--ch` (children) parameter.

```bash
wf2roam --wfid=14d48414c3c8 --ch
```

Reminder that you'll want to use a `-o` flag to save as JSON.
