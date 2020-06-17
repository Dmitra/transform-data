import convert from '../index'

describe('primitive source', () => {
  test('copy value as is', () => {
    const data = convert(1)
    expect(data).toBe(1)
  })

  test('skip value', () => {
    const data = convert(1, '')

    expect(data).toBeUndefined()
  })

  test('transform value by single function', () => {
    const data = convert(1, v => ++v)

    expect(data).toBe(2)
  })

  test('transform value to a function', () => {
    function value () {
    }

    const data = convert(1, v => value)

    expect(data).toBe(value)
  })
})

describe('nest root value by path as string rule', () => {
  test('simplest variant', () => {
    const data = convert(1, 'a')

    expect(data).toStrictEqual({ a: 1 })
  })

  test('nest root value by this directory ("./") rule', () => {
    const data = convert(1, './a')

    expect(data).toStrictEqual({ a: 1 })
  })

  test('nest root value by go up 1 level ("../") rule', () => {
    const data = convert(1, '../a')

    expect(data).toStrictEqual({ a: 1 })
  })

  test('nest root value by absolute path rule', () => {
    const data = convert(1, '/a')

    expect(data).toStrictEqual({ a: 1 })
  })

  test('dot should be ignored in path ("/./a") rule', () => {
    const data = convert(1, '/./a')

    expect(data).toStrictEqual({ a: 1 })
  })

  test('nest root value deeper', () => {
    const data = convert(1, 'a/b')

    expect(data).toStrictEqual({ a: { b: 1 } })
  })
})

describe('array syntax', () => {
  test('nest and transform root value by functions', () => {
    const data = convert(1,
      [v => ++v, path => [...path, 'a']],
    )

    expect(data).toStrictEqual({ a: 2 })
  })

  test('nest and replace root value by strings', () => {
    const data = convert(1, [2, 'a'])

    expect(data).toStrictEqual({ a: 2 })
  })

  test('missing value transformation', () => {
    const data = convert(1, [, 'a'])

    expect(data).toStrictEqual({ a: undefined })
  })

  test('missing path', () => {
    const data = convert(1, [2])

    expect(data).toBe(2)
  })

  test('specify path as current (".")', () => {
    const data = convert(1, [2, '.'])

    expect(data).toBe(2)
  })

  test('copy source to multiple paths', () => {
    const data = convert(1, [v => v, ['a', 'b']])

    expect(data).toStrictEqual({ a: 1, b: 1 })
  })

  test('multiple transformations', () => {
    const data = convert(1, [[v => ++v, v => v * v]])

    expect(data).toStrictEqual(4)
  })

  test('multiple transformations for multiple paths', () => {
    const data = convert(1,
      [(v, path, source, target) => {
        const t = target['/'] = {}
        t.a = ++v
        t.b = v * v
      }, ''],
    )

    expect(data).toStrictEqual({ a: 2, b: 4 })
  })
})

describe('object syntax', () => {
  test('copy object as is', () => {
    const data = convert({ a: 1 })

    expect(data).toStrictEqual({ a: 1 })
  })

  test('copy empty source with empty map object', () => {
    const data = convert({}, {})

    expect(data).toStrictEqual({})
  })

  test('copy source with empty map object', () => {
    const data = convert({ a: 1 }, {})

    expect(data).toStrictEqual({ a: 1 })
  })

  test('ignore rules for missing paths', () => {
    const data = convert(
      {},
      { a: '_a' },
    )
    expect(data).toStrictEqual({})
  })

  test('rename key', () => {
    const data = convert(
      { a: 1 },
      { a: '_a' },
    )
    expect(data).toStrictEqual({ _a: 1 })
  })

  test('rename key by "go level up" path', () => {
    const data = convert(
      { a: 1 },
      { a: '../_a' },
    )
    expect(data).toStrictEqual({ _a: 1 })
  })

  test('move value to the root', () => {
    const data = convert(
      { a: 1 },
      { a: '/' },
    )
    expect(data).toBe(1)
  })

  test('copy sibling elements as is', () => {
    const data = convert(
      { a: 1, b: 2 },
      { a: '_a' },
    )

    expect(data).toStrictEqual({ _a: 1, b: 2 })
  })

  test('exchange keys between two sources', () => {
    const data = convert(
      { a: 1, b: 2 },
      { a: 'b', b: 'a' },
    )

    expect(data).toStrictEqual({ b: 1, a: 2 })
  })

  test('transform all object elements by glob pattern', () => {
    const data = convert(
      { a: 1, b: 2 },
      { '*': v => ++v },
    )

    expect(data).toStrictEqual({ a: 2, b: 3 })
  })

  test('transform parent and child', () => {
    const data = convert({ a: { b: 2, } },
      {
        a: {
          '.': '_a',
          b: '_b',
        },
      },
    )

    expect(data).toStrictEqual({ _a: { _b: 2 } })
  })

  test('transform parent to multiple destinations and child', () => {
    const data = convert({ a: { b: 2, } },
      {
        a: {
          '.': [v => v, ['_a', '__a']],
          b: '_b',
        },
      },
    )

    expect(data).toStrictEqual({ _a: { _b: 2 }, __a: { _b: 2 } })
  })

  describe('array in source', () => {
    test('copy empty array as is with glob rule for elements', () => {
      const data = convert(
        [],
        { '*': v => ++v },
      )

      expect(data).toStrictEqual([])
    })

    test('transform specific array element', () => {
      const data = convert(
        [1, 2, 3],
        { 0: v => ++v, 1: '' },
      )

      expect(data).toStrictEqual([2, , 3])
    })

    test('transform each array element', () => {
      const data = convert(
        [1, 2],
        { '*': v => ++v },
      )

      expect(data).toStrictEqual([2, 3])
    })

    test('transform objects in array', () => {
      const data = convert(
        [{ a: 1 }, { a: 2 }],
        { '*': { a: v => ++v } },
      )

      expect(data).toStrictEqual([{ a: 2 }, { a: 3 }])
    })

    test('transform nested array', () => {
      const data = convert(
        { a: [1, 2] },
        { a: { '*': v => ++v } },
      )

      expect(data).toStrictEqual({ a: [2, 3] })
    })
  })
})
