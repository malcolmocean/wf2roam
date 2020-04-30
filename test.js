// hi and welcome to the most minimal test ever
const wf2roam = require('./wf2roam.js')
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
const options = {underlineToHighlight: true}
const result = wf2roam.convertJsonObject(nodes, dateJoinedTimestampInSeconds, options)
const expected = [
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

const assert = require('assert')
try {
  assert.deepEqual(result, expected)
  console.log("result", JSON.stringify(result, 0, 2))
  console.log('\x1b[32m')//, 'green')
  console.log("✓ there's one test and it worked")
  console.log('\x1b[0m')
} catch (err) {
  console.log('\x1b[31m')//, 'Error')
  console.log("✗ there's one test and it just broke\n")
  console.log('\x1b[33m' + "result =", JSON.stringify(result, null, 2))
  console.log('\x1b[34m' + "expected =", JSON.stringify(expected, null, 2))
  console.log('\x1b[0m')
}
