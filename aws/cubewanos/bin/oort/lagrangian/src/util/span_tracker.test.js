import { reconcileSpans } from './span_tracker'

const cm = (ls) => ls.map(i => i.join('.')).join(',')

it('reconciles spans', () => {
    const testCases = [
        {
            spans: [[1, 2], [3, 4], [5, 6]],
            newSpan: [1, 10],
            expected: [[1, 10]],
        },
        {
            spans: [[1, 2], [3, 4], [5, 6]],
            newSpan: [3, 10],
            expected: [[1, 2], [3, 10]],
        },
        {
            spans: [[1, 2], [3, 4], [5, 6], [8, 9]],
            newSpan: [3, 10],
            expected: [[1, 2], [3, 10]],
        },
        {
            spans: [[1, 2], [5, 6]],
            newSpan: [3, 4],
            expected: [[1, 2], [3, 4], [5, 6]],
        },
        {
            spans: [[1, 10]],
            newSpan: [3, 4],
            expected: [[1, 10]],
        },
        {
            spans: [[1, 10]],
            newSpan: [10, 11],
            expected: [[1, 11]],
        },
        {
            spans: [[5, 10]],
            newSpan: [1, 6],
            expected: [[1, 10]],
        },
        {
            spans: [[3, 4], [5, 10]],
            newSpan: [1, 6],
            expected: [[1, 10]],
        },
        {
            spans: [[3, 4], [5, 10]],
            newSpan: [3, 4],
            expected: [[3, 4], [5, 10]],
        }
    ]
    testCases.forEach(tc => {
        const res = reconcileSpans(tc.spans, tc.newSpan)
        expect(cm(res)).toEqual(cm(tc.expected))
    })
})