// spanA  al-----ar
// spanB            bl-----br
function leftOf(spanA, spanB) {
    const [al, ar] = spanA;
    const [bl, br] = spanB;
    return (ar < bl)
}

// spanA   al-----ar
// spanB       bl-----br
function leftOverlap(spanA, spanB) {
    const [al, ar] = spanA;
    const [bl, br] = spanB;
    return (al < bl) && (ar >= bl) && (ar < br)
}

// spanA      al-----ar
// spanB   bl-----br
function rightOverlap(spanA, spanB) {
    const [al, ar] = spanA;
    const [bl, br] = spanB;
    return (bl < al) && (al <= br) && (br < ar)
}

// spanA            al-----ar
// spanB bl-----br
function rightOf(spanA, spanB) {
    const [al, ar] = spanA;
    const [bl, br] = spanB;
    return (al > br)
}

// spanA    al--ar
// spanB bl--------br
function within(spanA, spanB) {
    const [al, ar] = spanA;
    const [bl, br] = spanB;
    return (bl <= al) && (ar <= br)
}

function reconcileSpans(spans, newSpan) {
    const [nStart, nEnd] = newSpan
    if (nStart >= nEnd) {
        return spans
    }
    let newSpans = []
    
    let lastSpan = [0, 0]
    let tracking = false
    let trackLeft = 0
    const postUpdateLastSpan = (func) => (item) => {
        func(item)
        lastSpan = item
        return
    }
    spans.forEach(postUpdateLastSpan((curSpan) => {
        // console.log(newSpan, curSpan, lastSpan, tracking)
        // let loggo = ''
        // const fencs = [leftOf, rightOf, leftOverlap, rightOverlap, within]
        // fencs.forEach((fenc) => {
        //     console.log(fenc, fenc(newSpan, curSpan))
        // })
        if (tracking) {
            if (leftOf(newSpan, curSpan)) {
                newSpans.push([trackLeft, newSpan[1]])
                newSpans.push(curSpan)
                tracking = false
                return
            }

            if (within(curSpan, newSpan)) {
                return
            }

            if (leftOverlap(newSpan, curSpan)) {
                // const [al, ar] = newSpan
                const [bl, br] = curSpan
                newSpans.push([trackLeft, br])
                tracking = false
                return
            }
        }

        if (rightOf(newSpan, lastSpan)
            && leftOf(newSpan, curSpan)) {
            newSpans.push(newSpan)
            newSpans.push(curSpan)
            return
        }

        if (leftOverlap(newSpan, curSpan)) {
            const [al, ar] = newSpan;
            const [bl, br] = curSpan;
            newSpans.push([al, br])
            return
        }

        if (within(newSpan, curSpan)) {
            newSpans.push(curSpan)
            return
        }

        if (rightOverlap(newSpan, curSpan)) {
            tracking = true
            trackLeft = curSpan[0]
            return
        }

        if (within(curSpan, newSpan)) {
            tracking = true
            trackLeft = newSpan[0]
            return
        }

        newSpans.push(curSpan)
    }))

    if (tracking) {
        newSpans.push([trackLeft, newSpan[1]])
    }

    return newSpans
}

export { reconcileSpans }