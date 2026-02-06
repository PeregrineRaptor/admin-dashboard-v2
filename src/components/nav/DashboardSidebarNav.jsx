"use client";
import {
  hdlExpandedNavItems,
  hdlExpandedNavItemsBackUp,
  hdlSelectedNavItems,
} from "@/lib/rtk/features/common/dashboardSlice";
import { Box, Typography } from "@mui/material";
import { TreeItem, TreeView } from "@mui/x-tree-view";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { Scrollbars } from "rc-scrollbars";
import { useEffect } from "react";
import { MdKeyboardArrowUp, MdOutlineKeyboardArrowDown } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";

export default function DashboardSidebarNav({ navItems }) {
  const paths = usePathname();
  const dispatch = useDispatch();
  const { expandedNavItems, selectedNavItems } = useSelector(
    (state) => state.dashboard
  );
  let pathNames = paths.split("/").filter((path) => path);
  let keys = [];

  const childMenu = (children) => {
    children.map((cItem) => {
      if (cItem.children) {
        keys = [...keys, cItem.key];
        childMenu(cItem.children);
      }
      keys = [...keys, cItem.key];
    });
  };

  navItems.map((item) => {
    if (item.children) {
      keys = [...keys, item.key];
      childMenu(item.children);
    } else keys = [...keys, item.key];
  });

  useEffect(() => {
    if (pathNames.length > 1) {
      let items = pathNames[pathNames.length - 1];
      dispatch(hdlSelectedNavItems(items));
      dispatch(hdlExpandedNavItems(pathNames));
      dispatch(hdlExpandedNavItemsBackUp(pathNames));
    } else {
      pathNames = pathNames[0] == "" ? ["/"] : pathNames;
      dispatch(hdlSelectedNavItems(pathNames));
      dispatch(hdlExpandedNavItems(pathNames));
      dispatch(hdlExpandedNavItemsBackUp(pathNames));
    }
  }, []);

  const hdlToggle = (nodeId, parent) => {
    if (expandedNavItems.includes(nodeId)) {
      let toggleNodeIdIndex = expandedNavItems.indexOf(nodeId);
      let toggleNodeIds =
        toggleNodeIdIndex != -1
          ? expandedNavItems.slice(0, toggleNodeIdIndex)
          : [];
      dispatch(hdlExpandedNavItems(toggleNodeIds));
      dispatch(hdlExpandedNavItemsBackUp(toggleNodeIds));
    } else {
      if (!expandedNavItems.includes(parent)) {
        dispatch(hdlSelectedNavItems([nodeId]));
        dispatch(hdlExpandedNavItems([nodeId]));
        dispatch(hdlExpandedNavItemsBackUp([nodeId]));
      } else {
        let parentIdPosition = expandedNavItems.indexOf(parent) + 1;
        let items =
          expandedNavItems.length > parentIdPosition
            ? expandedNavItems.slice(0, parentIdPosition)
            : expandedNavItems;
        dispatch(hdlSelectedNavItems([nodeId]));
        dispatch(hdlExpandedNavItems([...items, nodeId]));
        dispatch(hdlExpandedNavItemsBackUp([...items, nodeId]));
      }
    }
  };

  const showChildMenu = (children, parentKey) => {
    return children.map((cItem) => {
      if (cItem.children) {
        return (
          <TreeItem
            nodeId={cItem.key}
            label={
              <>
                <Box component="figure">{cItem.icon}</Box>
                <Typography>{cItem.label}</Typography>
              </>
            }
            key={cItem.key}
            onClick={() => {
              hdlToggle(cItem.key, parentKey);
            }}
          >
            {showChildMenu(cItem.children, cItem.key)}
          </TreeItem>
        );
      }
      return (
        <NextLink href={`${cItem.url}`} target={cItem.target} key={cItem.key}>
          <TreeItem
            nodeId={cItem.key}
            label={
              <>
                <Box component="figure">{cItem.icon}</Box>
                <Typography>{cItem.label}</Typography>
              </>
            }
            onClick={() => {
              hdlToggle(cItem?.key, parentKey);
            }}
          />
        </NextLink>
      );
    });
  };

  return (
    <Box className="tree-view-wrapper">
      <Scrollbars style={{ height: "100%" }} universal autoHide>
        <TreeView
          aria-label="controlled"
          defaultCollapseIcon={<MdKeyboardArrowUp />}
          defaultExpandIcon={<MdOutlineKeyboardArrowDown />}
          expanded={expandedNavItems}
          selected={selectedNavItems}
          // onNodeToggle={hdlToggle}
          // onNodeSelect={hdlSelect}
        >
          {navItems.map((item) => {
            if (item.children) {
              return (
                <TreeItem
                  key={item.key}
                  nodeId={item.key}
                  label={
                    <>
                      <Box component="figure">{item.icon}</Box>
                      <Typography>{item.label}</Typography>
                    </>
                  }
                  onClick={() => {
                    hdlToggle(item?.key, "0");
                  }}
                >
                  {showChildMenu(item.children, item.key)}
                </TreeItem>
              );
            }
            return (
              <NextLink
                href={`${item.url}`}
                target={item.target}
                key={item.key}
              >
                <TreeItem
                  nodeId={item.key}
                  label={
                    <>
                      <Box component="figure">{item.icon}</Box>
                      <Typography>{item.label}</Typography>
                    </>
                  }
                  onClick={() => {
                    hdlToggle(item?.key, "0");
                  }}
                />
              </NextLink>
            );
          })}
        </TreeView>
      </Scrollbars>
    </Box>
  );
}
