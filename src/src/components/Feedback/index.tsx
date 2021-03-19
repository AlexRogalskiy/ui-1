import React from "react"
import { ClassComponent } from "@kubevious/ui-framework"
import { Snooze } from "../Snooze"
import { PostFeedback } from "../PostFeedback"
import $ from "jquery"
import _ from "the-lodash"
import cx from "classnames"

import "./styles.scss"

import { IMiscService } from "@kubevious/ui-middleware"
import { Answer, FeedbackState, Kind, FeedbackProps, Question } from "./types"

export class Feedback extends ClassComponent<
    FeedbackProps,
    FeedbackState,
    IMiscService
> {
    constructor(props: FeedbackProps) {
        super(props, null, { kind: "misc" })

        this.state = {
            userAnswers: {},
            missingAnswers: {},
            isSubmitAllowed: true,
        }

        this.handleInputChange = this.handleInputChange.bind(this)
        this.handleMultiselect = this.handleMultiselect.bind(this)
        this.setClicked = this.setClicked.bind(this)
        this.handleSubmit = this.handleSubmit.bind(this)
    }

    checkAnswers(): boolean {
        const missingAnswers = {}
        let isQuestionsAnswered = true
        const { userAnswers } = this.state
        const { request } = this.props
        request.questions &&
            request.questions.forEach((question: Question) => {
                if (!question.optional) {
                    const answerInfo = userAnswers[question.id]
                    if (!answerInfo || !answerInfo.hasValue) {
                        missingAnswers[question.id] = true
                        isQuestionsAnswered = false
                    }
                }
                return
            })
        this.setState({
            isSubmitAllowed: isQuestionsAnswered,
            missingAnswers: missingAnswers,
        })
        return isQuestionsAnswered
    }

    handleSubmit(): void {
        const { userAnswers } = this.state
        const { request } = this.props
        const checkResult = this.checkAnswers()
        if (checkResult) {
            const answers = _.values(userAnswers)
                .filter((x: Answer) => x.hasValue)
                .map((x: Answer) => ({
                    id: x.id,
                    value: x.value,
                }))

            const data = {
                id: request.id,
                kind: request.kind,
                answers: answers,
            }

            this.service.submitFeedback(data, () => {
                this.sharedState.set("popup_window", {
                    title: "Post Feedback",
                    content: <PostFeedback />,
                })
            })
        }
    }

    //***
    //e: React.ChangeEvent<HTMLTextAreaElement> | React.FormEvent<HTMLDivElement> | React.MouseEvent<HTMLButtonElement, MouseEvent>
    //***
    handleInputChange(e): void {
        const { userAnswers } = this.state
        const value = e.target.value
        let hasValue = false
        if (_.isNotNullOrUndefined(value) && value.length > 0) {
            hasValue = true
        }

        userAnswers[e.target.name] = {
            id: e.target.name,
            value: value,
            hasValue: hasValue,
        }

        this.setState({
            userAnswers: userAnswers,
        })
    }

    //***
    //e: React.MouseEvent<HTMLButtonElement, MouseEvent>
    //***
    handleMultiselect(e): void {
        e.target.classList.toggle("clicked")

        const { userAnswers } = this.state
        let userAnswer = userAnswers[e.target.name]
        if (!userAnswer) {
            userAnswer = {
                id: e.target.name,
                hasValue: false,
                options: {},
            }
        }

        if (userAnswer.options && e.target.value in userAnswer.options) {
            delete userAnswer.options[e.target.value]
        } else {
            const options = {
                [e.target.value]: true,
            }
            userAnswer = { ...userAnswer, options }
        }

        userAnswer.value = _.keys(userAnswer.options)
        const hasValue = userAnswer.value && userAnswer.value.length > 0
        userAnswer.hasValue = !!hasValue
        userAnswers[e.target.name] = userAnswer
        this.setState({
            userAnswers: userAnswers,
        })
    }

    setClicked(e: React.FocusEvent<HTMLButtonElement>): void {
        $(`.user-single-select .${e.target.name}`).removeClass("clicked")
        e.target.classList.add("clicked")
    }

    renderQuestion(question: Question): JSX.Element | null {
        const { missingAnswers } = this.state
        switch (question.kind) {
            case Kind.input:
                return (
                    <div className="user-input">
                        <label
                            className={cx(
                                "input-question",
                                { "non-optional": !question.optional },
                                {
                                    "missing-answer":
                                        missingAnswers[question.id],
                                }
                            )}
                        >
                            {question.text}
                        </label>
                        <textarea
                            placeholder="Type here..."
                            name={question.id}
                            onChange={this.handleInputChange}
                        ></textarea>
                    </div>
                )
            case Kind.rate:
                return (
                    <div className="user-rate">
                        <label
                            className={cx(
                                "rate-question",
                                { "non-optional": !question.optional },
                                {
                                    "missing-answer":
                                        missingAnswers[question.id],
                                }
                            )}
                        >
                            {question.text}
                        </label>
                        <div
                            role="group"
                            className="rate-stars"
                            onChange={this.handleInputChange}
                        >
                            {[5, 4, 3, 2, 1].map((val) => (
                                <input
                                    type="radio"
                                    id={`star${val}`}
                                    key={val}
                                    name={question.id}
                                    value={val}
                                />
                            ))}
                        </div>
                    </div>
                )
            case Kind.single_select:
                return (
                    <div className="user-single-select">
                        <label
                            className={cx(
                                "select-question",
                                { "non-optional": !question.optional },
                                {
                                    "missing-answer":
                                        missingAnswers[question.id],
                                }
                            )}
                        >
                            {question.text}
                        </label>
                        <div role="group" className="select-buttons">
                            {question.options &&
                                question.options.map((option, index) => {
                                    return (
                                        <button
                                            key={index}
                                            type="button"
                                            name={question.id}
                                            className={question.id}
                                            onClick={this.handleInputChange}
                                            onFocus={this.setClicked}
                                            value={option}
                                        >
                                            {option}
                                        </button>
                                    )
                                })}
                        </div>
                    </div>
                )
            case Kind.multi_select:
                return (
                    <div className="user-select">
                        <label
                            className={cx(
                                "select-question",
                                { "non-optional": !question.optional },
                                {
                                    "missing-answer":
                                        missingAnswers[question.id],
                                }
                            )}
                        >
                            {question.text}
                        </label>
                        <div role="group" className="select-buttons">
                            {question.options &&
                                question.options.map((option, index) => {
                                    return (
                                        <button
                                            key={index}
                                            type="button"
                                            name={question.id}
                                            onClick={this.handleMultiselect}
                                            value={option}
                                        >
                                            {option}
                                        </button>
                                    )
                                })}
                        </div>
                    </div>
                )
            default:
                return null
        }
    }

    render() {
        const { request } = this.props
        const { questions } = request
        const { isSubmitAllowed } = this.state

        return (
            <div className="separate-container">
                <div className="feedback-header">
                    <h3 className="heading-text">Give us your feedback</h3>
                </div>
                <div className="feedback-info">
                    {questions &&
                        questions.map((question, index) => (
                            <div className="feedback-question" key={index}>
                                {this.renderQuestion(question)}
                            </div>
                        ))}

                    {!isSubmitAllowed && (
                        <div className="submit-error">
                            We need your feedback on required (*) fields.
                        </div>
                    )}

                    <button
                        className="feedback-submit button success"
                        onClick={this.handleSubmit}
                        type="submit"
                    >
                        Submit Feedback
                    </button>
                </div>
                <Snooze id={request.id} kind={request.kind} />
            </div>
        )
    }
}