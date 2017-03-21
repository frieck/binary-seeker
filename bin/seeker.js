var program = require('commander');

program.version('v' + require('../package.json').version)
    .description('Read/Write bse archive files');

program.command('*')
    .action(function(cmd) {
        console.log('seeker: \'%s\' is not an seeker command. See \'seeker --help\'.', cmd)
    })

program.parse(process.argv)

if (program.args.length === 0) {
    program.help()
}