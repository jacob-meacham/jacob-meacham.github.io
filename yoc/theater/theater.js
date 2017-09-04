function populateDiary(entries, $diaryElement, side) {
  const $entriesParent = $diaryElement.find('.diary-entries')
  for (const entry of entries) {
    const $entryContainer = $('<div/>')
      .addClass('diary-entry-container')

    $entryContainer.append(
      $('<img/>')
        .addClass('top')
        .attr('src', 'img/' + side + '_top.png')
    )

    if (entry.blank) {
      $entryContainer.append($('<div/>').addClass('diary-entry blank'))
    } else {
      const $entryElement = $('<div/>')
        .addClass('diary-entry')
        .append(
          $('<div/>')
            .addClass('date')
            .text(entry.date)
        ).append(
          $('<span/>')
          .addClass('text')
          .text(entry.text)
        )

      $entryContainer.append($entryElement)
    }

    const bottomImageName = entry.bottomImageName ? entry.bottomImageName : 'img/' + side + '_bottom.png'
    $entryContainer.append(
      $('<img/>')
        .addClass('bottom')
        .attr('src', bottomImageName)
    )

    $entriesParent.append($entryContainer)
  }
}

function matchEntryHeights() {
  const $diary1Entries = $('.left-diary .diary-entry-container')
  const $diary2Entries = $('.right-diary .diary-entry-container')
  $diary1Entries.each(function(index) {
    const $diary2Entry = $diary2Entries.eq(index)

    // Reset heights
    $(this).css('height', 'auto');
    $diary2Entry.css('height', 'auto');

    const height1 = $(this).height()
    const height2 = $diary2Entry.height()

    const largestHeight = Math.max(height1, height2)
    $(this).height(largestHeight)
    $diary2Entry.height(largestHeight)
  })
}

function setRightHeight($leftDiary, $rightDiary) {
  $rightDiary.css('height', $leftDiary.height() + 'px')
}

// TODO: There is almost surely a way to do this in CSS
function handleRightResize($rightDiary) {
  const fullRightMargin = 144
  const currentWidth = $(window).width()

  let rightMargin = fullRightMargin - (1440 - currentWidth)
  rightMargin = Math.min(rightMargin, fullRightMargin)
  rightMargin = Math.max(rightMargin, 5)
  $rightDiary.find('.diary-container').css('right', rightMargin)

  // Linearly interpolate from padding of 480-410 over screen sizes
  // 867-400
  const maxWidth = 867
  const minWidth = 400
  const maxPadding = 480
  const minPadding = 380
  let pct = (maxWidth - currentWidth) / (maxWidth-minWidth)
  pct = Math.min(pct, 1.0)
  pct = Math.max(pct, 0.0)

  let padding = minPadding + (maxPadding - minPadding) * (1.0 - pct)
  padding = padding + 'px'
  $rightDiary.find('.diary-first-page').css('padding-left', padding)
  $rightDiary.find('.diary-entry').css('padding-left', padding)
}

function setupDivider($leftDiary, $rightDiary) {
  // Work around a bug in jquery.event.move
  // by keeping track of our own velocity
  let velocityX = 0.0
  let lastTimestamp = Date.now()
  let springAmplitude = 0.0
  let targetPosition = $(window).width() / 2
  const TIME_CONSTANT = 325
  const $resizer = $('.resizer')

  function setWidths(position) {
    const windowWidth = $(window).width()
    position = Math.max(position, 0.0)
    position = Math.min(position, windowWidth)

    position = position + 'px'

    $resizer.css('left', position)

    // N.B. Clip is in T,R,B,L order
    $leftDiary.css('clip', 'rect(0,' + position + ', 99999px, 0)');
    $rightDiary.css('clip', 'rect(0, ' + windowWidth + 'px, 99999px,' + position + ')');
  }

  function autoScroll() {
    const elapsed = Date.now() - lastTimestamp
    const delta = -springAmplitude * Math.exp(-elapsed / TIME_CONSTANT)
    if (delta > 0.5 || delta < -0.5) {
      targetPosition -= delta
      setWidths(targetPosition)
      requestAnimationFrame(autoScroll)
    }
  }

  $resizer
    .on('movestart', function() {
      let lastTimestamp = Date.now()
      let velocityX = 0.0
    })
    .on('move', function(e) {
      const now = Date.now()
      const time = now - lastTimestamp

      setWidths(e.pageX)

      lastTimestamp = now
      targetPosition = e.pageX
      velocityX = 0.8 * e.deltaX / time + 0.2 * velocityX
    }).bind('moveend', function(event) {
      let multiplier = 2.5
      if (Math.abs(velocityX) > 3.5) {
        multiplier = 6.0
      }

      springAmplitude = multiplier * velocityX
      lastTimestamp = Date.now()
      requestAnimationFrame(autoScroll)
    })

  $(window).on('resize', function() {
    setWidths(targetPosition)
  })

  setWidths(targetPosition)
}

const $leftDiary = $('.left-diary')
const $rightDiary = $('.right-diary')
populateDiary(diary1Entries, $leftDiary, 'left')
populateDiary(diary2Entries, $rightDiary, 'right')

setupDivider($leftDiary, $rightDiary)

function onResize() {
  handleRightResize($rightDiary)
  matchEntryHeights()
  setRightHeight($leftDiary, $rightDiary)
}

$(window).on('resize', onResize)

// Force a resize on the next tick
setTimeout(onResize, 500)
