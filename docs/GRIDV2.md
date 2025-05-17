Upgrade to Grid v2
This guide explains how and why to migrate from the GridLegacy component to the Grid component.
 ads via Carbon
Join us May 30th for world's largest hackathon for non-devs and vibe coders. $1M+ Prize pool.
ads via Carbon

Grid component versions

In Material UI v7, the GridLegacy component has been deprecated and replaced by Grid, which offers several new features as well as significant improvements to the developer experience. This guide explains how to upgrade from GridLegacy to Grid, and includes details for Material UI v5, v6, and v7.

Why you should upgrade

Grid provides the following improvements over GridLegacy:

It uses CSS variables, removing CSS specificity from class selectors. You can use sx prop to control any style you'd like.
All grids are considered items without specifying the item prop.
The offset feature gives you more flexibility for positioning.
Nested grids now have no depth limitation.
Its implementation doesn't use negative margins so it doesn't overflow like GridLegacy.
How to upgrade

Prerequisites

Before proceeding with this upgrade:

You must be on Material UI v5+.
If you're in the process of upgrading your Material UI version, you should complete that upgrade first.
1. Update the import

Depending on the Material UI version you are using, you must update the import as follows:

v7
v6
v5
Copy
// The legacy Grid component is named GridLegacy
-import Grid from '@mui/material/GridLegacy';

// The updated Grid component is named Grid
+import Grid from '@mui/material/Grid';
2. Remove legacy props

The item and zeroMinWidth props have been removed in the updated Grid. You can safely remove them:

-<Grid item zeroMinWidth>
+<Grid>

Copy
3. Update the size props

Skip this step if you're using Material UI v5.
In the GridLegacy component, the size props were named to correspond with the theme's breakpoints. For the default theme, these were xs, sm, md, lg, and xl.

Starting from Material UI v6, these props are renamed to size on the updated Grid:

 <Grid
-  xs={12}
-  sm={6}
+  size={{ xs: 12, sm: 6 }}
 >

Copy
If the size is the same for all breakpoints, then you can use a single value:

-<Grid xs={6}>
+<Grid size={6}>

Copy
Additionally, the true value for the size props was renamed to "grow":

-<Grid xs>
+<Grid size="grow">

Copy
You can use the following codemod to update the size props:

v7
v6
v5
Copy
npx @mui/codemod@next v7.0.0/grid-props <path/to/folder>
The codemod requires updating the imports beforehand.
4. Opt in to legacy negative margins

Skip this step if you're using Material UI v6 or v7.
If you're using Material UI v5 and want to apply the negative margins similar to GridLegacy, specify disableEqualOverflow={true} on the grid container. To apply to all grids, add the default props to the theme:

import { createTheme, ThemeProvider } from '@mui/material/styles';
import Grid from '@mui/material/Unstable_Grid2';

const theme = createTheme({
  components: {
    MuiGrid2: {
      defaultProps: {
        // all grids under this theme will apply
        // negative margin on the top and left sides.
        disableEqualOverflow: true,
      },
    },
  },
});

function Demo() {
  return (
    <ThemeProvider theme={theme}>
      <Grid container>...grids</Grid>
    </ThemeProvider>
  );
}

Copy
Common issues

Column direction

Using direction="column" or direction="column-reverse" is not supported on GridLegacy nor on the updated Grid. If your layout used GridLegacy with these values, it might break when you switch to the updated Grid. If you need a vertical layout, follow the instructions in the Grid documentation.

Container width

The updated Grid component doesn't grow to the full width of the container by default. If you need the grid to grow to the full width, you can use the sx prop:

-<GridLegacy container>
+<Grid container sx={{ width: '100%' }}>

 // alternatively, if the Grid's parent is a flex container:
-<GridLegacy container>
+<Grid container sx={{ flexGrow: 1 }}>

Copy
Codemod not covering wrapped Grid components

The provided codemods won't cover Grid components which are wrapped in other components or styled:

// The codemod won't cover StyledGrid
const StyledGrid = styled(Grid)({
  // styles
});

// The codemod won't cover WrappedGrid
const WrappedGrid = (props) => <Grid {...props} />;

Copy
You'll need to manually update these components.

Documentation pages

