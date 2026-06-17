import sys

def main():
    with open('src/app/page.tsx', 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the variables and wrap their contents in Fragments
    content = content.replace("const mealsSection = (", "const mealsSection = (\n<>\n")
    content = content.replace("          );\n          \n          const prioritiesSection", "\n</>\n          );\n          \n          const prioritiesSection")
    
    content = content.replace("const prioritiesSection = (", "const prioritiesSection = (\n<>\n")
    content = content.replace("          );\n          \n          const goalsSection", "\n</>\n          );\n          \n          const goalsSection")

    content = content.replace("const goalsSection = (", "const goalsSection = (\n<>\n")
    content = content.replace("          );\n          \n          const healthSection", "\n</>\n          );\n          \n          const healthSection")

    content = content.replace("const healthSection = (", "const healthSection = (\n<>\n")
    content = content.replace("          );\n          \n          const notesSection", "\n</>\n          );\n          \n          const notesSection")

    content = content.replace("const notesSection = (", "const notesSection = (\n<>\n")
    content = content.replace("          );\n          \n          const mobileTabs", "\n</>\n          );\n          \n          const mobileTabs")

    # todosSection is already wrapped in <div className="flex flex-col gap-4 flex-1">
    
    with open('src/app/page.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("SUCCESS")

if __name__ == '__main__':
    main()
