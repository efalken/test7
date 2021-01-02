import { Box } from '@rebass/grid'
import React from 'react'


export default function IndicatorA({ size, value, color, bgColor }) {
    return <Box style={{
        fontSize: size,
        backgroundColor: bgColor,
        color: color
    }}>
        {value}
    </Box>
}