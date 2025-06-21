// Content script for Teachable Course Timer Extension
// This script runs on Teachable pages and can be enhanced with additional features

(function() {
    'use strict';
    
    // Check if we're on a course page
    function isCourseePage() {
        return document.querySelector('.lecture-sidebar') !== null ||
               document.querySelector('.course-section') !== null;
    }
    
    // Add a floating course info widget (optional feature)
    function addCourseInfoWidget() {
        if (!isCourseePage()) return;
        
        const widget = document.createElement('div');
        widget.id = 'teachable-timer-widget';
        widget.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 10px 15px;
                border-radius: 8px;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                font-size: 12px;
                z-index: 10000;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                cursor: pointer;
                user-select: none;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255,255,255,0.2);
            " title="Click to analyze course with Teachable Timer extension">
                📚 Course Timer Ready
            </div>
        `;
        
        widget.addEventListener('click', () => {
            // This could trigger the extension popup or analysis
            alert('Click the Teachable Course Timer extension icon to analyze this course!');
        });
        
        document.body.appendChild(widget);
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            widget.style.opacity = '0.7';
        }, 5000);
    }
    
    // Enhanced course data extraction with additional metadata
    function getEnhancedCourseData() {
        const data = {
            courseTitle: '',
            instructor: '',
            sections: [],
            metadata: {
                platform: 'teachable',
                extractedAt: new Date().toISOString(),
                pageUrl: window.location.href
            }
        };
        
        // Try to get course title
        const titleElement = document.querySelector('h1.course-sidebar-header-title, .course-title, h1');
        if (titleElement) {
            data.courseTitle = titleElement.textContent.trim();
        }
        
        // Try to get instructor name
        const instructorElement = document.querySelector('.instructor-name, .author-name, .teacher-name');
        if (instructorElement) {
            data.instructor = instructorElement.textContent.trim();
        }
        
        return data;
    }
    
    // Watch for dynamic content changes (Teachable often loads content dynamically)
    function observeChanges() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length > 0) {
                    // Check if course content was added
                    const hasCourseSections = Array.from(mutation.addedNodes).some(node => 
                        node.nodeType === 1 && 
                        (node.classList?.contains('course-section') || 
                         node.querySelector?.('.course-section'))
                    );
                    
                    if (hasCourseSections) {
                        console.log('Teachable Course Timer: New course content detected');
                    }
                }
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    function init() {
        if (isCourseePage()) {
            console.log('Teachable Course Timer: Course page detected');
            addCourseInfoWidget();
            observeChanges();
        }
    }
    
    // Message listener for communication with popup
    chrome.runtime?.onMessage?.addListener((request, sender, sendResponse) => {
        if (request.action === 'getCourseData') {
            const courseData = getEnhancedCourseData();
            sendResponse(courseData);
        }
        return true;
    });
    
})();