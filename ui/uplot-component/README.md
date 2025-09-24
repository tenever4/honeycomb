# React uPlot Component

React wrapper for [uPlot](https://github.com/leeoniya/uPlot). Takes `data`, `series`, and `options` props as well as `dataRevision`, `seriesRevision`, and `optionsRevision`. If any of the props change the appropriate uPlot functions will be rerun to update the plot.

# Use

```jsx

// ...

render() {

    return <UPlotComponent
        data={[[1,2,3,4], [1,2,3,4]]}
        series={[{}, { /* uplot series options */ }]}
        options={{ /* uplot options */ }}
    />

}
```
