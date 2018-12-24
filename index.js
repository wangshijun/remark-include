var VFile = require('vfile')
var path = require('path')
var fs = require('fs')

var parseInclude = /^@include (.*)(\n|$)/
var defaultInclude = function(root) {
  return root.children;
};

module.exports = function (options) {
  var proc = this;
  options = options || {}
  var cwd = options.cwd || process.cwd()
  var onInclude = options.onInclude || defaultInclude

  var prt = proc.Parser.prototype
  prt.blockTokenizers.include = tokenizer
  prt.blockMethods.unshift('include')

  return function transformer(ast, file) {
    var children = ast.children

    for (var i = 0; i < children.length; i++) {
      var child = children[i]
      if (child.type === 'include') {
        // Load file and create VFile
        // console.log(cwd, file)
        // var file = toFile(path.join(file.dirname || cwd, child.value))

        // Parse vfile contents
        // var parser = new processor.Parser(file, null, processor)
        var root = proc.runSync(proc.parse(
          toFile(path.join(child.source.dirname || cwd, child.value))
        ))

        // Split and merge the head and tail around the new children
        var head = children.slice(0, i)
        var tail = children.slice(i + 1)
        children = head.concat(onInclude(root).children).concat(tail)

        // Remember to update the offset!
        i += root.children.length - 1
      }
    }

    ast.children = children
  }
}

function tokenizer (eat, value, silent) {
  var self = this
  var settings = self.options
  var length = value.length + 1
  var index = -1
  var now = eat.now()
  var node

  if (silent && parseInclude.test(value)) {
    return true
  }

  // Replace all lines beginning with @include
  while (parseInclude.test(value)) {
    var file = value.match(parseInclude)[1]
    var frag = '@include ' + file
    value = value.slice(frag.length)
    eat(frag)({
      type: 'include',
      source: this.file,
      value: file
    })
  }

  return node
}

function toFile(full) {
  return new VFile({path: full, contents: loadContent(full).toString('utf8')})
}

function loadContent(file) {
  // console.log('loading', file)
  try { return fs.readFileSync(file) }
  catch (e) {}

  try { return fs.readFileSync(file + '.md') }
  catch (e) {}

  try { return fs.readFileSync(file + '.markdown') }
  catch (e) {}

  throw new Error('Unable to include ' + file)
}
