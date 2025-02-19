# Route Description Editor Changes

## Attempted Changes

1. Added a rich text editor using Draft.js with:
   - Bold, italic, and underline formatting buttons
   - Ordered and unordered list buttons
   - Line break button
   - Placeholder text "Enter description..."

2. Tried to improve the editor functionality:
   - Made the placeholder disappear when text is entered
   - Added proper list indentation with marginLeft
   - Added list continuation on Enter key
   - Added list exit when pressing Enter on empty list item
   - Added tab support for list indentation

## Current Issues

1. Text Formatting Issues:
   - Bold, italic, and underline only work when text is highlighted first
   - Cannot start typing with formatting applied
   - Need to implement a way to toggle formatting for new text

2. Line Break Tool:
   - The line break tool doesn't work as expected
   - The `insertLineBreak` function using `Modifier.splitBlock` isn't functioning properly
   - Consider replacing with a horizontal rule (hr) tool instead
   - Could use `toggleBlockType` with a custom block type for horizontal rules

## Suggested Improvements

1. Text Formatting:
   - Implement a "format mode" that applies to new text
   - Store current format state and apply to inserted text
   - Add visual feedback for active format modes

2. Line Break Alternative:
   - Replace line break with horizontal rule
   - Add a new block type 'hr' in Draft.js
   - Use custom block rendering to display the horizontal rule
   - Example implementation:
     ```typescript
     const HR_TYPE = 'hr';
     
     // Add button
     <IconButton onClick={() => toggleBlockType(HR_TYPE)}>
       <HorizontalRuleIcon />
     </IconButton>

     // Custom block renderer
     const blockRendererFn = (block) => {
       if (block.getType() === HR_TYPE) {
         return {
           component: () => <hr style={{ borderColor: 'rgb(70, 70, 70)' }} />,
           editable: false,
         };
       }
       return null;
     };
     ```

3. UI Improvements:
   - Make active states more visible
   - Add tooltips for all buttons
   - Consider grouping related tools
   - Add keyboard shortcuts once basic functionality is working
