import {
  set, hasIn,
  isUndefined, isString, isFunction, isArray, isPlainObject,
  each, castArray, flatten, slice,
} from 'lodash-es'

const SEPARATOR = '/'
const SPECIAL_KEY = '.'

export default function convert (source, map, dest, srcPath = [SEPARATOR], destPath = srcPath) {
  source = hasIn(source, SEPARATOR) ? source : { [SEPARATOR]: source }
  dest = hasIn(dest, SEPARATOR) ? dest : { [SEPARATOR]: dest }
  map = hasIn(map, SEPARATOR) ? map : { [SEPARATOR]: map }

  const curValue = getByPath(source, srcPath)
  let curMapObj = getByPath(map, srcPath)
  const multiRule = hasIn(curMapObj, SPECIAL_KEY)
  let curMap = multiRule ? curMapObj[SPECIAL_KEY] : curMapObj
  let destValue

  // copy values as is
  if (isUndefined(curMap)) {
    destValue = curValue
  }
  // skip values
  if (curMap === '') return

  // move value to parent object with `curMap` key OR to specified absolute path
  if (isString(curMap)) {
    const curMapPath = parsePath(curMap)
    const isAbsolute = curMapPath[0] === SEPARATOR
    destPath = isAbsolute ? curMapPath : compactPath(destPath, '..', curMapPath)
    destValue = curValue
  }

  if (isFunction(curMap)) {
    destValue = curMap(curValue)
  }

  const destPaths = []
  // proceed working with multiple destination paths
  if (isArray(curMap)) {
    // first argument is a value transform function or array of these options or new value
    const valueTransformations = castArray(curMap[0])
    // perform chained transformation on derived result
    let value = curValue
    each(valueTransformations, valueTransformation => {
      if (isFunction(valueTransformation)) {
        value = valueTransformation(value, srcPath, source, dest)
      } else {
        value = valueTransformation
      }
    })
    destValue = value

    // second argument is a path transform function or new path or array of these options
    const pathTransformations = castArray(curMap[1])
    each(pathTransformations, transform => {
      if (isFunction(transform)) {
        // TODO should pass destPath instead OR as well?
        destPaths.push(transform(srcPath, curValue, source, dest))
      } else {
        if (transform === '') return
        const curMapPath = parsePath(transform)
        const isAbsolute = curMapPath[0] === SEPARATOR
        destPaths.push(isAbsolute ? curMapPath : compactPath(destPath, '..', curMapPath))
      }
    })
  } else {
    destPaths.push(destPath)
  }

  curMap = multiRule ? curMapObj : curMap
  if (isPlainObject(curMap)) {
    const isValueObject = isPlainObject(curValue)
    const isValueArray = isArray(curValue)
    if (isValueObject || isValueArray) {
      each(destPaths, destPath => {
        // init array
        set(dest, stringifyPath(destPath), isValueObject ? {} : [])
        each(curValue, (v, key) => {
          const newSrcPath = [...srcPath, key]
          const newDestPath = [...destPath, key]
          return convert(source, map, dest, newSrcPath, newDestPath)
        })
      })
    }
  } else {
    each(destPaths, destPath => {
      set(dest, stringifyPath(destPath), destValue)
    })
  }

  return dest[SEPARATOR]
}

function getByPath (obj, path) {
  let result = obj
  each(path, part => {
    if (!isUndefined(result['*'])) result = result['*']
    else result = result[part]
  })
  return result
}

function parsePath (str) {
  const absolute = str && str.startsWith(SEPARATOR)
  if (absolute) str = str.slice(1)
  if (absolute && str.length === 0) return [SEPARATOR]

  let path = str ? str.split(SEPARATOR) : '.'
  if (absolute) path.unshift(SEPARATOR)
  return compactPath(path)
}

function compactPath (...parts) {
  parts = flatten(parts)
  let path = []
  each(parts, part => {
    if (part === '..') {
      if (path.length > 1 || path[0] !== SEPARATOR) {
        path = [...slice(path, 0, path.length - 1)]
      }
    } else if (part === '.') return
    else {
      path.push(part)
    }
  })

  return path
}

function stringifyPath (path) {
  return path.join('.')
}
