import React, { Component } from "react";
import { connect } from "react-redux";
import {
  noteImages,
  restImages,
  findAccidentals,
} from "../constants/kalimbaConstants";

class Note extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selected: false,
      hovered: false,
      time: 4,
      accidental: "None",
    };
  }

  getImage = (time, isRest) => {
    if (!isRest) {
      for (let i = 0; i < noteImages.length; i++) {
        if (time === noteImages[i].time) {
          return noteImages[i].image;
        }
      }
    } else {
      for (let i = 0; i < restImages.length; i++) {
        if (time === restImages[i].time) {
          return restImages[i].image;
        }
      }
    }

    return false;
  };

  checkForAccidental = () => {
    //if the note has any type of accidental, check it against the tine notes
    //if the tine notes and this not match, don't display an accidental
    //otherwise do.
    let noteInSong = this.props.song[this.props.tineIndex][this.props.noteIndex]
      .note;
    if (this.props.tineNotes[this.props.tineIndex] === noteInSong) {
      return false;
    } else {
      return findAccidentals(noteInSong);
    }
  };

  render() {
    let noteInQuestion = this.props.song[this.props.tineIndex][
      this.props.noteIndex
    ];
    let wasClicked = noteInQuestion.note !== "";
    let displayTime = noteInQuestion.time;
    let isRest = noteInQuestion.note === "rest";
    let imgsrc = this.getImage(displayTime, isRest);
    let acc = this.checkForAccidental();
    let noteImage = displayTime;
    if (imgsrc) {
      noteImage = (
        <img
          src={imgsrc}
          style={{ width: 15, height: "auto" }}
          alt={this.props.value}
        />
      );
    }

    return (
      <div
        style={{
          height: 45,
          marginTop: 5,
          display: "flex",
          backgroundColor:
            this.state.hovered || this.props.isHighlighted ? "yellow" : "",
          justifyContent: "center",
          alignItems: "center",
          cursor: "pointer",
        }}
        onClick={() => {
          this.setState({
            // selected: !this.state.selected,
            time: this.props.selectedNote,
            accidental: this.props.selectedAccidental,
          });
          this.props.onClick(
            wasClicked,
            this.props.selectedNote,
            this.props.rest
          );
        }}
        onMouseEnter={() => {
          this.setState({ hovered: true });
        }}
        onMouseLeave={() => {
          this.setState({ hovered: false });
        }}
      >
        {wasClicked ? (
          acc !== false ? (
            <div>
              {noteImage}
              {isRest ? <></> : <div>{acc}</div>}
            </div>
          ) : (
            noteImage
          )
        ) : (
          ""
        )}
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    selectedNote: state.selectedNote,
    selectedAccidental: state.selectedAccidental,
    song: state.song,
    rest: state.rest,
    tineNotes: state.tineNotes,
  };
};

export default connect(mapStateToProps)(Note);
