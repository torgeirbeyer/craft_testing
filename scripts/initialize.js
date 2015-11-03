var Promise = require('bluebird')
var inq = require('inquirer')
var chalk = require('chalk')

var log = console.log.bind(console)

var fs = Promise.promisifyAll(require('fs'))

var _ = require('lodash')
_.templateSettings.interpolate = /{{([\s\S]+?)}}/g

var logErr = console.log.bind(console, 'err')

var templatizedFiles = [
  'README.md',
  'package.json',
  'craft/config/general.php'
]

/**
* Init craft project
* 1. Deduct name from path
* 2. Replace name into configuration
* 3. Install NPM components
*/

function answered (question) {
  return function (answers) {
    return !_.isEmpty(answers[question])
  }
}

var questions = [
  {
    type: 'input',
    name: 'name',
    message: 'Name this project',
    validate: function (val) {
      return (!!val.match(/^[a-zA-Z0-9\-_]+$/) || 'Invalid name')
    }
  },
  {
    type: 'input',
    name: 'repo',
    message: 'GitHub repo name (just the last part)',
    default: function (a) { return a.name }
  }
]

function writeFileFn (file) {
  return function (content) {
    return fs.writeFileAsync(file, content, 'utf8')
  }
}

function templateFile (context, file) {
  return fs.readFileAsync(file)
    .then(function (tpl) {
      return _.template(tpl)(context)
    })
    .then(function (content) {
      return writeFileFn(file)(content).then(function () {
        return content;
      });
    });
}

function replaceIntoFiles (context, files) {
  return Promise.all(files.map(templateFile.bind(null, context)));
}

function copyFile (from, to) {
  return fs.readFileAsync(from)
    .then(function(content) {
      return content.toString()
    })
    .then(writeFileFn(to))
}

// 1. update package.json with name
// 2. update craft/config/general
// 3. inform user of changes
inq.prompt(questions, function (context, done) {
  var logWrite = function (text) {
    log(chalk.bold.green('✓'), text)
  }

  log(chalk.blue.underline('Setting up configuration files'))

  Promise.all([
    copyFile('.templates/README.md', 'README.md')
  ])
    .then(replaceIntoFiles(context, templatizedFiles))
    .error(logErr)
    .then(function () { templatizedFiles.forEach(logWrite); })
    .then(function () {
      var filename = '.templates/gitftp'
      return templateFile(context, filename).then(function (gitFtpConfig) {
        log("\n");
        log(chalk.blue('Add this to the end of', chalk.underline('.git/config')))
        log(gitFtpConfig);
      })
    })
})
