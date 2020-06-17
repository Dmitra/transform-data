# Purpose
Utility to transform data based on instructions.

# Description
Input data may be of any type as well as output data.  
Transformation is performed on data structure and via provided functions on the values too.

Internally it is a single function called recursively on the same **source** and **rules** params.
They are accompanied by optionally provided or set at root call **target** object.
And the only variable showing the current depth of recursion is absolute **path**.  
Current values of source and rules are retrieved by this absolute path
and are written to the target.
   
    convert(source, rules, target = {}, path = '/') {
        ...
        return target['/']
    }
    
# Usage
There is a single function which can transform input value to the output by rules provided.
In its simplest case with no rules provided this function will return the input value as is:

    convert(1) ==> 1

## Rules of Transformation 
### String - path
path starting with '/' is absolute  
relative path is prepended by '../' by default
    
    convert(1, 'a') ==> { a: 1 }
equivalent to  

    convert(1, '../a') 
as there is no parent beyond root object - parent prefix is replaced by current path: './a'

### Func
    convert(1, v => ++v) ==> 2
    
### Array - [vFunc | [vFuncs] | new value, pathFunc | [pathFuncs] new path]

vFunc - value transformation func

path is implied to be current if not provided

    convert(1, [v => ++v]) ==> 2
    // equivalent to
    convert(1, [v => ++v, '.'])
    
path - relative path to write value to target

    convert(1, [v => ++v, 'a']) ==> {a: 2}
    
path starting with '/' is treated as absolute

    convert(1, [v => ++v, '/.a']) ==> {a: 2}
    
pathFunc - path transformation func

    convert({ a: 1 },  [v => v, path => '_' + path] ) ==> { _a: 1 }
    
### Objects
Rules as an object should match the structure of the source object.
They should have identical hierarchy where only leaves are rules instead of values.  

Paths in rules missing in source object will be ignored.
Missing paths in rules means, that source values will be copied to the target as is.
There might be a conflict between new paths and "copied by default".
The is no guaranteed order of keys iteration for objects, so define unique rules to avoid overwriting.

    convert({ a: 1}, { a: 'b'}) ==> { b: 1}
    
is equivalent to:

    convert({ a: 1 }, { a: '../b' }) ==> { b: 1 }
    
which reads as:  
Copy "values in a root source object with a key "a" to the parent object  
(relative to the value path) with a key "b".

#### Nested objects
Augment rules object with special key '.' to specify the rule for the parent and child simultaneously:

    convert(
      {
        a: {
          b: 2,
        },
      }, {
        a: {
          '.': '_a',
          b: '_b',
        },
      },
    )
    
#### Array source
##### Operate on each array item
    convert([1, 2], { '*': v => ++v }) ==> [2, 3]
    
### Special cases
#### Omit value
path is defined as "put the value nowhere"

    convert(1, '') ==> undefined'
    
#### Glob pattern
    convert({ a: 1, b: 2 }, { '*': v => ++v }) ==> { a: 2, b: 3 }
    
## Examples
For more use cases see [tests]().

# Competition
There are multiple projects serving the same goal with different approaches:
## [node-object-mapper](https://github.com/wankdanker/node-object-mapper)

This library is *rules*-centric.  
Rules end up being verbose and redundant if attributes are just copied:  

    { 'root.level1.level2': [['root.level1.CHANGED', v => ++v]]
    { 'root.level1.unchanged': [['root.level1.unchanged', v => ++v]]

## [node-json-transform](https://github.com/bozzltron/node-json-transform)
This library is *target*-centric defining rules as template of target object:  
with many special keys:

    item: {
      propNameInTarget: 'propNameInSource',  
    },
    remove: ["keyToRemove"],
    defaults: {
      "missingData": true
    },
    operate: [{
      run: value => 'result of transformation function',
      on: 'path.to.prop'
    }]

This makes sense when you are parsing incoming data to make specific format you want to use.
But it depends on the point of view: you might want to focus on the data you have.

## [Jsonata](https://jsonata.org)
This is a full-blown turing complete query language.
So instead of using javascript you have to learn custom DSL.
